import type { TourAPI } from "@/types";
import { ensurePlaces, type CatalogRepo } from "./sync";
import { planGuardedStep, syncHealth, type RunState, type RunStatus } from "./lib/guard-plan";
import { readPage, checkRun } from "./lib/sanity";
import { contentHash, classify, type StageKind, type StoredTour } from "./lib/content-hash";
import { presenceTransitions, type PresenceInput } from "./lib/presence";
import { planRetry } from "./lib/retry";
import { toTourRows, countryRows, type TourRow, type TranslationRow } from "./lib/tour-rows";
import type { PublishInput, StagedRow } from "./lib/sql";
import { assignTourSlugs, type ExistingTour } from "@/destinations/lib/assign-slugs";
import { DEFAULT_PROVIDER, naturalKey } from "@/destinations/lib/ids";
import { planCityIndexing, type CityIndexRow, type CityIndexUpdate } from "@/destinations/lib/indexing";
import { archiveRawItems, type ArchiveReport, type RawArchive } from "@/ingest/raw-archive";
import { freetourRawItems } from "@/ingest/lib/freetour-raw";

/** REQ-090: estado de indexación de las ciudades (City.indexableSince / failingSince, migración 0015). */
export interface CityIndexRepo {
  /** Ciudades con slug, con sus tours publicados (slug, activos y no removed) y lo guardado. */
  cityIndexInputs(): Promise<CityIndexRow[]>;
  saveCityIndex(updates: CityIndexUpdate[]): Promise<void>;
}

/**
 * Sync blindado del catálogo de FREETOUR (Ola 1, tras SYNC_GUARD_ENABLED).
 *
 * Una llamada por minuto, igual que el sync de hoy, pero:
 * 1. staging: cada página va a TourStage con su hash; "Tour" no se toca (REQ-071/073).
 * 2. close: barrera de cordura (vacío o > 20 % menos que la última corrida exitosa) → aborta (REQ-071).
 * 3. publishing: pasa a "Tour" solo lo que cambió, 100 por minuto, con respaldo previo;
 *    el último paso aplica la presencia (missing/removed) y avanza el checkpoint en el mismo batch (REQ-072/074).
 * Fallos de la API: 429 respeta Retry-After, login sin bucle, 5xx con espera (REQ-077).
 * Cada corrida queda en SyncRun (REQ-078).
 */

export interface RunPatch {
  status?: RunStatus;
  finishedAt?: Date;
  nextPage?: number;
  totalPages?: number;
  failures?: number;
  notBefore?: Date | null;
  seen?: number;
  added?: number;
  changed?: number;
  ratingUpdates?: number;
  abortReason?: string;
}

export interface GuardedRepo extends Pick<CatalogRepo, "existingCityIds" | "existingCountryIds" | "upsertCountries" | "upsertCities"> {
  latestRun(): Promise<RunState | null>;
  lastSuccess(): Promise<{ finishedAt: Date; seen: number } | null>;
  /** Tours activos hoy (línea base de la primera corrida blindada). */
  activeCount(): Promise<number>;
  createRun(run: { id: string; startedAt: Date; baseline: number }): Promise<void>;
  updateRun(id: string, patch: RunPatch, now: Date): Promise<void>;
  /** Borra el staging de corridas viejas; conserva las últimas `keepRuns` (su respaldo). */
  cleanupStages(keepRuns: number): Promise<void>;
  storedTours(externalIds: number[]): Promise<Map<number, StoredTour>>;
  stage(runId: string, rows: StagedRow[], now: Date): Promise<void>;
  stageCounts(runId: string): Promise<Record<StageKind, number>>;
  /** Filas por publicar (new/changed/rating) después de `after`, ordenadas por externalId. */
  nextChunk(runId: string, after: number, limit: number): Promise<StagedRow[]>;
  presenceInputs(runId: string): Promise<PresenceInput[]>;
  /** REQ-086: tours de estos externalId (con o sin slug) más todos los que ya tienen slug (para no chocar). */
  slugIndex(externalIds: number[]): Promise<ExistingTour[]>;
  /** Respalda las filas que se van a sobrescribir y ejecuta el paso en un solo batch. */
  publish(input: Omit<PublishInput, "newId" | "backups">): Promise<void>;
}

interface Deps {
  api: { get(path: string): Promise<unknown> };
  repo: GuardedRepo;
  countries: Parameters<typeof countryRows>[0];
  now: Date;
  newId?: () => string;
  rebuildSearch?: () => Promise<void>;
  /** REQ-090: si viene, al cerrar cada corrida exitosa se recalcula y guarda la indexación de las ciudades. */
  indexing?: CityIndexRepo;
  /** Filas que se publican por minuto. */
  chunkSize?: number;
  /** REQ-743: archivo crudo (R2 privado + ProviderRecord). Solo viene con RAW_ARCHIVE_ENABLED="true" y el binding. */
  rawArchive?: RawArchive;
}

export const PUBLISH_CHUNK = 100;
/** Corridas cuyo staging (y respaldo) se conserva. */
export const KEEP_STAGED_RUNS = 7;

type TourPayload = { tour: Omit<TourRow, "lastSeenAt"> & { lastSeenAt: string | Date }; translations: TranslationRow[] };

// REQ-071, REQ-072, REQ-073, REQ-074, REQ-077, REQ-078
export async function runGuardedSyncStep(deps: Deps) {
  const result = await step(deps);
  const last = await deps.repo.lastSuccess();
  return { ...result, health: syncHealth(last?.finishedAt ?? null, deps.now) };
}

async function step({ api, repo, countries, now, newId = () => crypto.randomUUID(), rebuildSearch, indexing, chunkSize = PUBLISH_CHUNK, rawArchive }: Deps) {
  const latest = await repo.latestRun();
  const plan = planGuardedStep(latest, now);

  switch (plan.action) {
    case "idle":
      // Si hoy el login fue rechazado, nadie más debe intentar entrar (reseñas y salidas tampoco).
      return { action: "idle" as const, loginBlocked: latest?.status === "aborted" && !!latest.abortReason?.startsWith("login:") };
    case "wait":
      return { action: "wait" as const, until: plan.until.toISOString() };
    case "close":
      return close(repo, latest!, now);
    case "publish":
      return publish(repo, latest!, now, chunkSize, rebuildSearch, indexing);
    case "start": {
      if (latest?.status === "staging") {
        await repo.updateRun(latest.id, { status: "aborted", abortReason: "superseded", finishedAt: now }, now);
      }
      const baseline = (await repo.lastSuccess())?.seen ?? (await repo.activeCount());
      const run: RunState = {
        id: newId(), status: "staging", startedAt: now, nextPage: 1, totalPages: 0, failures: 0,
        notBefore: null, publishCursor: 0, baseline, abortReason: null,
      };
      await repo.createRun({ id: run.id, startedAt: now, baseline });
      await repo.cleanupStages(KEEP_STAGED_RUNS);
      return stagePage({ api, repo, countries, now, run, page: 1, start: true, rawArchive });
    }
    case "page":
      return stagePage({ api, repo, countries, now, run: latest!, page: plan.page, start: false, rawArchive });
  }
}

async function abort(repo: GuardedRepo, run: RunState, now: Date, reason: string, detail: string, extra: RunPatch = {}) {
  console.error(`[sync] corrida ${run.id} abortada (${reason}): ${detail}. Tour no se tocó; se sigue sirviendo la última corrida buena.`);
  await repo.updateRun(run.id, { ...extra, status: "aborted", abortReason: `${reason}: ${detail}`.slice(0, 500), finishedAt: now }, now);
  return { action: "abort" as const, runId: run.id, reason, detail };
}

async function stagePage({ api, repo, countries, now, run, page, start, rawArchive }: {
  api: Deps["api"]; repo: GuardedRepo; countries: Deps["countries"]; now: Date; run: RunState; page: number; start: boolean; rawArchive?: RawArchive;
}) {
  let body: unknown;
  try {
    body = await api.get(`/tours?page=${page}`);
  } catch (e) {
    const err = e as { status?: number; retryAfter?: string | null; login?: boolean; message?: string };
    const retry = planRetry({ status: err.status ?? 0, retryAfter: err.retryAfter ?? null, login: !!err.login, failures: run.failures, now });
    if (retry.action === "abort") return abort(repo, run, now, retry.reason, `página ${page}: ${err.message ?? "error"}`);
    await repo.updateRun(run.id, { failures: run.failures + 1, notBefore: retry.notBefore }, now);
    return { action: "retry" as const, runId: run.id, page, status: err.status ?? 0, notBefore: retry.notBefore.toISOString() };
  }

  // REQ-743 / REQ-744: copia exacta de cada item ANTES de validarlo o transformarlo; si falla, se registra y se sigue.
  let raw: ArchiveReport | null = null;
  if (rawArchive) raw = await archiveRawItems(rawArchive, { provider: "freetour", items: freetourRawItems(body, page), runId: run.id, now });
  const rawField = raw ? { raw: { written: raw.written, revisited: raw.revisited, same: raw.same, failed: raw.failed } } : {};

  const read = readPage<TourAPI>(body);
  if (!read.ok) return abort(repo, run, now, read.reason, `página ${page}: ${read.detail}`);

  const allCountries = countryRows(countries);
  if (start) await repo.upsertCountries(allCountries);
  await ensurePlaces({ api: api as never, repo, tours: read.tours, allCountries });

  const rows = read.tours.map((t) => toTourRows(t, run.startedAt));
  const stored = await repo.storedTours(rows.map((r) => r.tour.externalId));
  const staged: StagedRow[] = await Promise.all(
    rows.map(async (r) => {
      const hash = await contentHash(r);
      const kind = classify(hash, r.tour, stored.get(r.tour.externalId));
      const payload = kind === "same" ? null : kind === "rating" ? { rating: r.tour.rating, reviewsNumber: r.tour.reviewsNumber } : r;
      return { externalId: r.tour.externalId, hash, kind, payload };
    })
  );
  await repo.stage(run.id, staged, now);
  await repo.updateRun(run.id, { nextPage: page + 1, totalPages: read.totalPages, failures: 0, notBefore: null }, now);
  const count = (k: StageKind) => staged.filter((s) => s.kind === k).length;
  return {
    action: start ? ("start" as const) : ("page" as const),
    runId: run.id, page, totalPages: read.totalPages, tours: staged.length, dropped: read.dropped,
    new: count("new"), changed: count("changed"), rating: count("rating"), ...rawField,
  };
}

async function close(repo: GuardedRepo, run: RunState, now: Date) {
  const c = await repo.stageCounts(run.id);
  const seen = c.new + c.changed + c.rating + c.same;
  const counts = { seen, added: c.new, changed: c.changed, ratingUpdates: c.rating };
  const verdict = checkRun({ seen, baseline: run.baseline });
  if (!verdict.ok) return abort(repo, run, now, verdict.reason, verdict.detail, counts);
  await repo.updateRun(run.id, { ...counts, status: "publishing" }, now);
  return { action: "close" as const, runId: run.id, ...counts, baseline: run.baseline };
}

/** Título para el slug: español, luego inglés, luego el primero que haya. */
const slugTitle = (translations: TranslationRow[]) =>
  (translations.find((t) => t.language === "es")?.title || translations.find((t) => t.language === "en")?.title || translations[0]?.title || "").trim();

/**
 * REQ-086: slug de cada tour NUEVO del paso, una sola vez. Los que ya existían conservan el suyo (o siguen sin
 * slug hasta el llenado aprobado por el PO); la base además solo escribe si está vacío.
 */
// REQ-086
export function newTourSlugs(existing: readonly ExistingTour[], fresh: { externalId: number; translations: TranslationRow[] }[]) {
  const known = new Set(existing.map((e) => naturalKey(e.providerId, e.externalId)));
  const todo = fresh.filter((t) => !known.has(naturalKey(DEFAULT_PROVIDER, t.externalId)));
  const byKey = new Map(todo.map((t) => [naturalKey(DEFAULT_PROVIDER, t.externalId), t.externalId]));
  const incoming = todo.map((t) => ({ providerId: DEFAULT_PROVIDER, externalId: t.externalId, title: slugTitle(t.translations) }));
  return assignTourSlugs(existing, incoming).flatMap((a) => (a.slug && a.source === "new" ? [{ externalId: byKey.get(a.key)!, slug: a.slug }] : []));
}

function fromPayload(row: StagedRow): { tour: TourRow; translations: TranslationRow[]; hash: string } {
  const p = row.payload as TourPayload;
  return { tour: { ...p.tour, lastSeenAt: new Date(p.tour.lastSeenAt) } as TourRow, translations: p.translations, hash: row.hash };
}

async function publish(repo: GuardedRepo, run: RunState, now: Date, chunkSize: number, rebuildSearch?: () => Promise<void>, indexing?: CityIndexRepo) {
  const chunk = await repo.nextChunk(run.id, run.publishCursor, chunkSize);
  const tours = chunk.filter((r) => r.kind === "new" || r.kind === "changed").map(fromPayload);
  const ratings = chunk
    .filter((r) => r.kind === "rating")
    .map((r) => ({ externalId: r.externalId, ...(r.payload as { rating: number | null; reviewsNumber: number }) }));
  const fresh = chunk.filter((r) => r.kind === "new").map(fromPayload);
  const slugs = fresh.length
    ? newTourSlugs(await repo.slugIndex(fresh.map((t) => t.tour.externalId)), fresh.map((t) => ({ externalId: t.tour.externalId, translations: t.translations })))
    : [];
  const cursor = chunk.length ? chunk[chunk.length - 1].externalId : run.publishCursor;
  const last = chunk.length < chunkSize;

  let finalize: PublishInput["finalize"] = null;
  if (last) {
    const { updates, counts } = presenceTransitions(await repo.presenceInputs(run.id));
    const c = await repo.stageCounts(run.id);
    finalize = { updates, counts, seen: c.new + c.changed + c.rating + c.same, totalPages: run.totalPages };
  }
  await repo.publish({ runId: run.id, startedAt: run.startedAt, now, tours, ratings, slugs, cursor, finalize });

  if (!last) return { action: "publish" as const, runId: run.id, published: chunk.length, cursor };

  let searchIndex: "ok" | "error" | "skipped" = "skipped";
  if (rebuildSearch) {
    try { await rebuildSearch(); searchIndex = "ok"; } catch (e) { console.error("[busqueda] no se rehízo el índice:", (e as Error).message); searchIndex = "error"; }
  }
  // REQ-090: solo tras una corrida exitosa (el render lee este estado). Si falla, la corrida sigue exitosa
  // y la siguiente lo recalcula con la misma regla.
  let cityIndex: "ok" | "error" | "skipped" = "skipped";
  if (indexing) {
    try { await indexing.saveCityIndex(planCityIndexing(await indexing.cityIndexInputs(), now)); cityIndex = "ok"; }
    catch (e) { console.error("[indexacion] no se guardó el estado de las ciudades:", (e as Error).message); cityIndex = "error"; }
  }
  console.log(`[sync] corrida ${run.id} publicada: ${JSON.stringify(finalize!.counts)}`);
  return { action: "finish" as const, runId: run.id, published: chunk.length, ...finalize!.counts, searchIndex, cityIndex };
}
