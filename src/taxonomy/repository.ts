/**
 * T2b: acceso a D1 de la taxonomía (tablas de la migración 0017). Solo lee Tour, TourTranslation y Trip; solo escribe
 * en ExperienceTaxonomy y TaxonomyRun (REQ-409). Las filas viejas de ExperienceTaxonomy se podan conservando las
 * corridas publicadas más recientes; TaxonomyRun (la bitácora) no se borra.
 */
import { runBatch, upsertRows, type D1Like as D1Batch } from "@/lib/d1/batch";
import type { RunInfo, TaxonomyRow, TourRowForTaxonomy, TripRowForTaxonomy } from "./lib/run-plan";

type Stmt = { bind(...v: unknown[]): { all(): Promise<{ results: Record<string, unknown>[] }>; run(): Promise<unknown> } };
export interface TaxonomyD1 extends D1Batch { prepare(sql: string): Stmt }

export interface TaxonomyRepo {
  runningRun(): Promise<RunInfo | null>;
  lastPublished(): Promise<RunInfo | null>;
  createRun(id: string, startedAt: string, version: string): Promise<void>;
  abortRun(id: string, reason: string, now: string): Promise<void>;
  toursAfter(cursor: string, limit: number): Promise<TourRowForTaxonomy[]>;
  publishedTrips(): Promise<TripRowForTaxonomy[]>;
  writeRows(runId: string, version: string, computedAt: string, rows: TaxonomyRow[]): Promise<void>;
  setCursor(runId: string, cursor: string): Promise<void>;
  setTripsDone(runId: string): Promise<void>;
  runCounts(runId: string): Promise<{ axis: string; term: string; n: number }[]>;
  porRevisarRules(runId: string): Promise<{ ruleId: string; n: number }[]>;
  finishRun(runId: string, f: { status: "published" | "aborted"; counts: string; unmapped: string; unclassified: number; abortReason: string | null; now: string }): Promise<void>;
  /** Borra las filas de términos de corridas que ya no se leen (conserva las `keep` publicadas más recientes y la en curso). */
  /** REQ-3511: borra a lo más `limit` filas de corridas que ya no se leen; regresa cuántas borró. */
  prune(keep: number, limit: number): Promise<number>;
}

const toRun = (r: Record<string, unknown> | undefined): RunInfo | null =>
  r ? { id: String(r.id), status: r.status as RunInfo["status"], startedAt: String(r.startedAt), cursor: String(r.cursor ?? ""), tripsDone: Number(r.tripsDone) === 1, mappingVersion: String(r.mappingVersion) } : null;

export function createTaxonomyRepo(db: TaxonomyD1): TaxonomyRepo {
  const all = async (sql: string, ...v: unknown[]) => (await db.prepare(sql).bind(...v).all()).results;
  const run = (sql: string, ...v: unknown[]) => db.prepare(sql).bind(...v).run();
  return {
    async runningRun() { return toRun((await all(`SELECT * FROM "TaxonomyRun" WHERE "status"='running' ORDER BY "startedAt" DESC LIMIT 1`))[0]); },
    async lastPublished() { return toRun((await all(`SELECT * FROM "TaxonomyRun" WHERE "status"='published' ORDER BY "finishedAt" DESC LIMIT 1`))[0]); },
    async createRun(id, startedAt, version) { await run(`INSERT INTO "TaxonomyRun" ("id","startedAt","mappingVersion") VALUES (?,?,?)`, id, startedAt, version); },
    async abortRun(id, reason, now) { await run(`UPDATE "TaxonomyRun" SET "status"='aborted',"abortReason"=?,"finishedAt"=? WHERE "id"=?`, reason, now, id); },
    async toursAfter(cursor, limit) {
      return (await all(
        `SELECT t."id", t."providerId", t."categoryId", t."priceValue", t."durationMinutes", t."guideLanguages", t."rating", t."reviewsNumber",
                es."title" AS "titleEs", en."title" AS "titleEn", es."brief" AS "briefEs", en."brief" AS "briefEn", c."translations" AS "cityTr"
           FROM "Tour" t
           LEFT JOIN "City" c ON c."id" = t."cityId"
           LEFT JOIN "TourTranslation" es ON es."tourId" = t."id" AND es."language" = 'es'
           LEFT JOIN "TourTranslation" en ON en."tourId" = t."id" AND en."language" = 'en'
          WHERE t."isActive" = 1 AND t."id" > ? ORDER BY t."id" LIMIT ?`, cursor, limit,
      )) as unknown as TourRowForTaxonomy[];
    },
    async publishedTrips() {
      return (await all(`SELECT "id","kind","category","durationDays","titleEs","titleEn","priceFrom","languages","options","flightsIncluded" FROM "Trip" WHERE "status"='published' ORDER BY "id"`)) as unknown as TripRowForTaxonomy[];
    },
    async writeRows(runId, version, computedAt, rows) {
      const cols = ["experienceKind", "experienceId", "axis", "term", "ruleId", "mappingVersion", "runId", "computedAt"];
      const values = rows.map((r) => [r.experienceKind, r.experienceId, r.axis, r.term, r.ruleId.slice(0, 200), version, runId, computedAt]);
      await runBatch(db, upsertRows("ExperienceTaxonomy", cols, values, ["experienceKind", "experienceId", "axis", "term", "runId"], ["ruleId", "computedAt"]));
    },
    async setCursor(runId, cursor) { await run(`UPDATE "TaxonomyRun" SET "cursor"=? WHERE "id"=?`, cursor, runId); },
    async setTripsDone(runId) { await run(`UPDATE "TaxonomyRun" SET "tripsDone"=1 WHERE "id"=?`, runId); },
    async runCounts(runId) {
      return (await all(`SELECT "axis","term",COUNT(*) AS "n" FROM "ExperienceTaxonomy" WHERE "runId"=? AND "axis" IN ('formato','tema') GROUP BY "axis","term"`, runId))
        .map((r) => ({ axis: String(r.axis), term: String(r.term), n: Number(r.n) }));
    },
    async porRevisarRules(runId) {
      return (await all(`SELECT "ruleId",COUNT(*) AS "n" FROM "ExperienceTaxonomy" WHERE "runId"=? AND "axis"='formato' AND "term"='por-revisar' GROUP BY "ruleId"`, runId))
        .map((r) => ({ ruleId: String(r.ruleId), n: Number(r.n) }));
    },
    async finishRun(runId, f) {
      await run(`UPDATE "TaxonomyRun" SET "status"=?,"counts"=?,"unmapped"=?,"unclassified"=?,"abortReason"=?,"finishedAt"=? WHERE "id"=?`,
        f.status, f.counts, f.unmapped, f.unclassified, f.abortReason, f.now, runId);
    },
    // REQ-3511 (INC-015): por tandas. Una sola sentencia sobre millones de filas rebasa los límites de D1 y fallaba en silencio.
    async prune(keep, limit) {
      const r = (await db.prepare(
        `DELETE FROM "ExperienceTaxonomy" WHERE rowid IN (
           SELECT rowid FROM "ExperienceTaxonomy" WHERE "runId" NOT IN (
             SELECT "id" FROM "TaxonomyRun" WHERE "status"='running'
             UNION SELECT "id" FROM (SELECT "id" FROM "TaxonomyRun" WHERE "status"='published' ORDER BY "finishedAt" DESC LIMIT ?))
           LIMIT ?)`).bind(keep, limit).run()) as { meta?: { changes?: number }; changes?: number | bigint };
      return Number(r.meta?.changes ?? r.changes ?? 0);
    },
  };
}
