/** REQ-049: repositorio de salidas en D1 (SQL directo, fechas en el formato de Prisma). */
import type { DeparturesRepo } from "./sync";
import { sqlDate } from "@/lib/d1/batch";

type D1 = { prepare(sql: string): { bind(...v: unknown[]): { all(): Promise<{ results: Record<string, unknown>[] }>; run(): Promise<unknown> } } };

export function createDeparturesRepo(db: D1): DeparturesRepo {
  return {
    async dueTours(limit, before) {
      const { results } = await db.prepare(
        `SELECT "id", "externalId" FROM "Tour" WHERE "isActive" = 1 AND ("departuresCheckedAt" IS NULL OR "departuresCheckedAt" < ?1)
         ORDER BY "departuresCheckedAt" IS NOT NULL, "departuresCheckedAt" LIMIT ?2`).bind(sqlDate(before), limit).all();
      return results.map((r) => ({ id: String(r.id), externalId: Number(r.externalId) }));
    },
    async saveSummary(id, s, at) {
      await db.prepare(`UPDATE "Tour" SET "guideLanguages" = ?1, "departureDates" = ?2, "departuresSyncedAt" = ?3, "departuresCheckedAt" = ?3 WHERE "id" = ?4`)
        .bind(JSON.stringify(s.languages), JSON.stringify(s.dates), sqlDate(at), id).run();
    },
    async markChecked(id, at) {
      await db.prepare(`UPDATE "Tour" SET "departuresCheckedAt" = ?1 WHERE "id" = ?2`).bind(sqlDate(at), id).run();
    },
  };
}
