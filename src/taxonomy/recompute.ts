/**
 * T2b (REQ-408, REQ-409): un paso por minuto del recálculo de la taxonomía, tras TAXONOMY_SYNC_ENABLED (apagada).
 * Arranca después de cada sync exitoso, clasifica los tours activos por tandas y luego los viajes propios, y al cerrar
 * aplica la barrera de cordura: si pasa, publica la corrida (el sitio leerá solo la última publicada); si no, la aborta
 * y se sigue leyendo la anterior. Nunca escribe en Tour, TourTranslation ni Trip. Dependencias por parámetro.
 */
import type { Dictionary, Mapping } from "./schemas/dictionary";
import { classify } from "./lib/classify";
import { DEFAULT_GATES, type Gates } from "./lib/gates";
import {
  barrier, KEEP_TAXONOMY_RUNS, PRUNE_BATCH, PRUNE_MAX_ROUNDS, mappingVersion, planTaxonomyStep, rowsFor, TAXONOMY_BATCH, TOURS_DONE, tourToInput, tripToInput, unmappedFrom,
  type RunCounts,
} from "./lib/run-plan";
import type { TaxonomyRepo } from "./repository";
import { applyPrecedence, lineageForTour, lineageForTrip, type Declared } from "./lib/lineage";
import type { LineageRepo, OverrideRow } from "./lineage-repository";

export interface TaxonomyStepDeps {
  repo: TaxonomyRepo;
  dict: Dictionary;
  mappings: Record<string, Mapping>;
  /** Fin del último sync exitoso del catálogo (SyncRun); null si no hay. */
  lastSyncAt: string | null;
  now: Date;
  newId?: () => string;
  gates?: Gates;
  batch?: number;
  /** REQ-751/553/554 (Ola R2): recálculo con linaje, tras TAXONOMY_LINEAGE_ENABLED (apagada). Sin esto, todo sigue igual. */
  lineage?: { repo: LineageRepo; agencyMappings: Record<string, Mapping> };
}

const overridesByExperience = (rows: OverrideRow[]) => {
  const m = new Map<string, OverrideRow[]>();
  for (const r of rows) { const k = `${r.experienceKind}:${r.experienceId}`; m.set(k, [...(m.get(k) ?? []), r]); }
  return m;
};
const parseDeclared = (raw: string | null): Declared | null => { try { return raw ? (JSON.parse(raw) as Declared) : null; } catch { return null; } };

function countsFrom(rows: { axis: string; term: string; n: number }[]): RunCounts {
  const c: RunCounts = { formato: {}, tema: {}, total: 0 };
  for (const r of rows) {
    if (r.axis === "formato") { c.formato[r.term] = r.n; c.total += r.n; }
    else if (r.axis === "tema") c.tema[r.term] = r.n;
  }
  return c;
}

export async function runTaxonomyStep(d: TaxonomyStepDeps) {
  const { repo, dict, mappings } = d;
  const lin = d.lineage;
  // Con linaje, la versión incluye los mapeos por agencia: encender la bandera dispara una corrida nueva.
  const version = lin ? `${mappingVersion(dict, { ...mappings, ...lin.agencyMappings })}|linaje` : mappingVersion(dict, mappings);
  const nowIso = d.now.toISOString();
  const gates = d.gates ?? DEFAULT_GATES;
  const running = await repo.runningRun();
  const plan = planTaxonomyStep({ running, lastPublished: await repo.lastPublished(), lastSyncAt: d.lastSyncAt, version });

  switch (plan.action) {
    case "idle":
      return { action: "idle" as const };
    case "start": {
      if (running) await repo.abortRun(running.id, "superseded", nowIso);
      const id = (d.newId ?? (() => crypto.randomUUID()))();
      await repo.createRun(id, nowIso, version);
      return { action: "start" as const, runId: id };
    }
    case "tours": {
      const batch = d.batch ?? TAXONOMY_BATCH;
      if (lin) {
        // REQ-751 / REQ-754 / REQ-756
        const tours = await lin.repo.toursAfter(plan.run.cursor, batch);
        const ov = overridesByExperience(await lin.repo.overrides());
        const rows = tours.flatMap((t) => applyPrecedence(lineageForTour(t, dict, mappings, { rawHash: t.rawHash, gates }), dict, { overrides: ov.get(`tour:${t.id}`) }));
        await lin.repo.writeRows(plan.run.id, version, nowIso, rows);
        const cursor = tours.length < batch ? TOURS_DONE : tours[tours.length - 1].id;
        await repo.setCursor(plan.run.id, cursor);
        return { action: "tours" as const, runId: plan.run.id, classified: tours.length, done: cursor === TOURS_DONE };
      }
      const tours = await repo.toursAfter(plan.run.cursor, batch);
      const rows = tours.flatMap((t) => rowsFor("tour", t.id, classify(tourToInput(t), dict, mappings, gates)));
      await repo.writeRows(plan.run.id, version, nowIso, rows);
      const cursor = tours.length < batch ? TOURS_DONE : tours[tours.length - 1].id;
      await repo.setCursor(plan.run.id, cursor);
      return { action: "tours" as const, runId: plan.run.id, classified: tours.length, done: cursor === TOURS_DONE };
    }
    case "trips": {
      if (lin) {
        // REQ-753 / REQ-756: primero la denominación original del proveedor (ProviderRecord), luego el mapeo propio.
        const trips = await lin.repo.publishedTrips();
        const ov = overridesByExperience(await lin.repo.overrides());
        const rows = trips.flatMap((t) => {
          const original = t.provider && t.originalField && t.originalCategory
            ? { provider: t.provider, field: t.originalField, value: t.originalCategory, matchedTerm: null, rawHash: t.rawHash }
            : null;
          // Sin denominación original igual se liga al crudo del viaje (si ya se archivó).
          const lr = lineageForTrip(t, original, dict, mappings, lin.agencyMappings, { gates }).map((r) => ({ ...r, sourceRawHash: t.rawHash ?? null }));
          return applyPrecedence(lr, dict, { declared: parseDeclared(t.declaredTaxonomy), overrides: ov.get(`trip:${t.id}`) });
        });
        await lin.repo.writeRows(plan.run.id, version, nowIso, rows);
        await repo.setTripsDone(plan.run.id);
        return { action: "trips" as const, runId: plan.run.id, classified: trips.length };
      }
      const trips = await repo.publishedTrips();
      const rows = trips.flatMap((t) => rowsFor("trip", t.id, classify(tripToInput(t), dict, mappings, gates)));
      await repo.writeRows(plan.run.id, version, nowIso, rows);
      await repo.setTripsDone(plan.run.id);
      return { action: "trips" as const, runId: plan.run.id, classified: trips.length };
    }
    case "close": {
      const counts = countsFrom(await repo.runCounts(plan.run.id));
      const unmapped = unmappedFrom(await repo.porRevisarRules(plan.run.id));
      const prev = await repo.lastPublished();
      const previous = prev ? await repo.runCounts(prev.id).then(countsFrom) : null;
      const reason = barrier(counts, previous);
      // REQ-408: categorías sin mapear en el log de la corrida; el sync no se aborta por ellas.
      if (unmapped.length) console.warn(`[taxonomia] categorías sin mapear: ${JSON.stringify(unmapped)}`);
      await repo.finishRun(plan.run.id, {
        status: reason ? "aborted" : "published", counts: JSON.stringify(counts), unmapped: JSON.stringify(unmapped),
        unclassified: counts.formato["por-revisar"] ?? 0, abortReason: reason, now: nowIso,
      });
      await podar(repo); // REQ-3511: también al abortar (INC-015)
      if (reason) {
        console.error(`[taxonomia] corrida ${plan.run.id} abortada: ${reason}; se sigue leyendo la anterior`);
        return { action: "abort" as const, runId: plan.run.id, reason };
      }
      return { action: "publish" as const, runId: plan.run.id, total: counts.total, unmapped: unmapped.length };
    }
  }
}

// REQ-3511 (INC-015): poda por tandas al cerrar cada corrida, publicada o abortada. Si falla, se registra y la corrida sigue.
async function podar(repo: TaxonomyRepo) {
  try {
    for (let i = 0; i < PRUNE_MAX_ROUNDS; i++) if ((await repo.prune(KEEP_TAXONOMY_RUNS, PRUNE_BATCH)) < PRUNE_BATCH) return;
  } catch (e) {
    console.error(`[taxonomia] poda fallida: ${(e as Error).message}`);
  }
}
