import type { PrismaClient } from "@prisma/client";
import { runBatch, type D1Like } from "@/lib/d1/batch";
import { createCatalogRepo } from "./repository";
import type { GuardedRepo, CityIndexRepo } from "./guarded-sync";
import type { RunState, RunStatus } from "./lib/guard-plan";
import type { StageKind } from "./lib/content-hash";
import { stageStatements, publishBatch, cityIndexStatements, type StagedRow } from "./lib/sql";
import { cityIndexInputsSql, overlayRepoGuides } from "@/destinations/lib/indexing";
import { loadGuides } from "@/destinations/guias";
import { guideKey, guidePlain } from "@/destinations/lib/guia";
import { nonIndexableProviders } from "@/seo/lib/enrichment";

const PROVIDER = "freetour";

/**
 * Lecturas directas a D1: las columnas nuevas de Tour (contentHash, syncStatus, missingRuns) no están
 * en el modelo de Prisma para que el sitio no dependa del orden migración/código (ver schema.prisma).
 */
export interface D1Read {
  prepare(sql: string): { bind(...v: unknown[]): { all(): Promise<{ results: Record<string, unknown>[] }> } };
  batch: D1Like["batch"];
}

/** D1 acepta como máximo 100 parámetros por sentencia. */
const IN_CHUNK = 100;

async function selectIn(db: D1Read, sql: (marks: string) => string, ids: number[]) {
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const part = ids.slice(i, i + IN_CHUNK);
    const { results } = await db.prepare(sql(part.map(() => "?").join(", "))).bind(...part).all();
    out.push(...results);
  }
  return out;
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/**
 * GuardedRepo sobre D1 (migración 0014). Lecturas con Prisma; escrituras en batch directo a D1.
 * Solo lo usa el sync blindado (SYNC_GUARD_ENABLED="true").
 */
// REQ-071, REQ-072, REQ-073, REQ-074, REQ-078
export function createGuardedRepo(prisma: PrismaClient, db: D1Read, newId: () => string = () => crypto.randomUUID()): GuardedRepo {
  const places = createCatalogRepo(prisma, db as D1Like, newId);

  return {
    existingCityIds: places.existingCityIds,
    existingCountryIds: places.existingCountryIds,
    upsertCountries: places.upsertCountries,
    upsertCities: places.upsertCities,

    async latestRun() {
      const r = await prisma.syncRun.findFirst({ where: { provider: PROVIDER }, orderBy: { startedAt: "desc" } });
      if (!r) return null;
      const run: RunState = {
        id: r.id, status: r.status as RunStatus, startedAt: r.startedAt, nextPage: r.nextPage, totalPages: r.totalPages,
        failures: r.failures, notBefore: r.notBefore, publishCursor: r.publishCursor, baseline: r.baseline, abortReason: r.abortReason,
      };
      return run;
    },

    async lastSuccess() {
      const r = await prisma.syncRun.findFirst({
        where: { provider: PROVIDER, status: "succeeded", finishedAt: { not: null } },
        orderBy: { finishedAt: "desc" },
        select: { finishedAt: true, seen: true },
      });
      return r ? { finishedAt: r.finishedAt!, seen: r.seen } : null;
    },

    activeCount: () => prisma.tour.count({ where: { isActive: true } }),

    async createRun({ id, startedAt, baseline }) {
      await prisma.syncRun.create({ data: { id, provider: PROVIDER, status: "staging", startedAt, baseline, updatedAt: startedAt } });
    },

    async updateRun(id, patch, now) {
      await prisma.syncRun.update({ where: { id }, data: { ...patch, updatedAt: now } });
    },

    async cleanupStages(keepRuns) {
      // Staging propio del sync (no datos del sitio): se conservan las últimas corridas como respaldo.
      await runBatch(db as D1Like, [{
        sql: 'DELETE FROM "TourStage" WHERE "runId" NOT IN (SELECT "id" FROM "SyncRun" WHERE "provider" = ? ORDER BY "startedAt" DESC LIMIT ?)',
        params: [PROVIDER, keepRuns],
      }]);
    },

    async storedTours(externalIds) {
      const rows = await selectIn(db, (m) => `SELECT "externalId", "contentHash", "rating", "reviewsNumber" FROM "Tour" WHERE "externalId" IN (${m})`, externalIds);
      return new Map(rows.map((r) => [Number(r.externalId), {
        contentHash: (r.contentHash as string | null) ?? null, rating: num(r.rating), reviewsNumber: Number(r.reviewsNumber ?? 0),
      }]));
    },

    async stage(runId, rows, now) {
      await runBatch(db as D1Like, stageStatements(runId, rows, now));
    },

    async stageCounts(runId) {
      const groups = await prisma.tourStage.groupBy({ by: ["kind"], where: { runId }, _count: { _all: true } });
      const counts: Record<StageKind, number> = { new: 0, changed: 0, rating: 0, same: 0 };
      for (const g of groups) counts[g.kind as StageKind] = g._count._all;
      return counts;
    },

    async nextChunk(runId, after, limit) {
      const rows = await prisma.tourStage.findMany({
        where: { runId, kind: { in: ["new", "changed", "rating"] }, externalId: { gt: after } },
        orderBy: { externalId: "asc" },
        take: limit,
        select: { externalId: true, hash: true, kind: true, payload: true },
      });
      return rows.map((r): StagedRow => ({ externalId: r.externalId, hash: r.hash, kind: r.kind as StageKind, payload: r.payload }));
    },

    async presenceInputs(runId) {
      const { results } = await db.prepare(
        'SELECT t."externalId", t."syncStatus", t."missingRuns", t."isActive", (s."externalId" IS NOT NULL) AS "seen" FROM "Tour" t' +
        ' LEFT JOIN "TourStage" s ON s."runId" = ? AND s."externalId" = t."externalId"'
      ).bind(runId).all();
      return results.map((r) => ({
        externalId: Number(r.externalId), syncStatus: String(r.syncStatus), missingRuns: Number(r.missingRuns),
        isActive: Number(r.isActive) === 1 || r.isActive === true, seen: Number(r.seen) === 1 || r.seen === true,
      }));
    },

    // REQ-086: los tours del paso y todos los slugs ya guardados (para que el nuevo no choque con el índice único).
    async slugIndex(externalIds) {
      const [mine, withSlug] = await Promise.all([
        selectIn(db, (m) => `SELECT "id", "providerId", "externalId", "slug" FROM "Tour" WHERE "externalId" IN (${m})`, externalIds),
        db.prepare('SELECT "id", "providerId", "externalId", "slug" FROM "Tour" WHERE "slug" IS NOT NULL').bind().all().then((r) => r.results),
      ]);
      const byKey = new Map([...withSlug, ...mine].map((r) => [`${r.providerId}:${r.externalId}`, r]));
      return [...byKey.values()].map((r) => ({
        id: String(r.id), providerId: String(r.providerId ?? "freetour"), externalId: Number(r.externalId), slug: (r.slug as string | null) ?? null,
      }));
    },

    async publish(input) {
      // Respaldo: la fila actual (tal como está en D1) de cada tour que se va a sobrescribir, con sus
      // traducciones; va en el mismo batch que la escritura.
      const ids = input.tours.map((t) => t.tour.externalId);
      const [current, translations] = await Promise.all([
        selectIn(db, (m) => `SELECT * FROM "Tour" WHERE "externalId" IN (${m})`, ids),
        selectIn(db, (m) => `SELECT t."externalId", tr."language", tr."title", tr."brief", tr."description", tr."url" FROM "TourTranslation" tr JOIN "Tour" t ON t."id" = tr."tourId" WHERE t."externalId" IN (${m})`, ids),
      ]);
      const backups = current.map((row) => ({
        externalId: Number(row.externalId),
        previous: { tour: row, translations: translations.filter((tr) => Number(tr.externalId) === Number(row.externalId)) },
      }));
      await runBatch(db as D1Like, publishBatch({ ...input, backups, newId }));
    },
  };
}

const isoOrNull = (v: unknown) => (v === null || v === undefined || v === "" ? null : new Date(String(v)).toISOString());

/**
 * REQ-090: estado de indexación de las ciudades sobre D1 (columnas de la 0015). Cuenta los tours publicados
 * igual que /destinos: con slug, activos y no removed. Solo lo usa el sync blindado (SYNC_GUARD_ENABLED="true").
 */
// REQ-090
// REQ-1355: las guías del repo entran por parámetro (por omisión, loadGuides()), como en /destinos.
export function createCityIndexRepo(db: D1Read, guides: () => ReadonlyMap<string, string> = repoGuideTexts): CityIndexRepo {
  return {
    async cityIndexInputs() {
      // REQ-1203: además de los publicados, los indexables (sin los proveedores en false de PROVIDER_INDEXABLE).
      const q = cityIndexInputsSql(nonIndexableProviders());
      const { results } = await db.prepare(q.sql).bind(...q.params).all();
      const rows = results.map((r) => ({
        id: Number(r.id), guide: (r.guide as string | null) ?? null, activeTours: Number(r.activeTours ?? 0), indexableTours: Number(r.indexableTours ?? 0),
        indexableSince: isoOrNull(r.indexableSince), failingSince: isoOrNull(r.failingSince),
        key: r.iso2 && r.slug ? `${String(r.iso2)}/${String(r.slug)}` : null,
      }));
      return overlayRepoGuides(rows, guides()).map(({ key: _key, ...row }) => row);
    },
    async saveCityIndex(updates) {
      await runBatch(db as D1Like, cityIndexStatements(updates));
    },
  };
}

/** REQ-1355: texto plano de cada guía del repo, por llave «pais/ciudad». */
function repoGuideTexts(): ReadonlyMap<string, string> {
  return new Map(loadGuides().map((g) => [guideKey(g), guidePlain(g)]));
}
