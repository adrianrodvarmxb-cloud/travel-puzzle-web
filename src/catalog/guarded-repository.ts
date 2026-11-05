import type { PrismaClient } from "@prisma/client";
import { runBatch, sqlValue, type D1Like } from "@/lib/d1/batch";
import { createCatalogRepo } from "./repository";
import type { GuardedRepo } from "./guarded-sync";
import type { RunState, RunStatus } from "./lib/guard-plan";
import type { StageKind } from "./lib/content-hash";
import { stageStatements, publishBatch, type StagedRow } from "./lib/sql";

const PROVIDER = "freetour";

/** Columnas de Tour que se respaldan antes de sobrescribir (las mismas que escribe el sync). */
const BACKUP_SELECT = {
  externalId: true, providerTitle: true, providerPhone: true, priceValue: true, priceCurrency: true, duration: true,
  durationMinutes: true, titleImageURL: true, categoryId: true, rating: true, reviewsNumber: true, cityId: true, countryId: true,
  meetingPoint: true, includes: true, POIs: true, images: true, videoURL: true, isActive: true, lastSeenAt: true,
  contentHash: true, syncStatus: true, missingRuns: true, updatedAt: true,
  translations: { select: { language: true, title: true, brief: true, description: true, url: true } },
} as const;

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/**
 * GuardedRepo sobre D1 (migración 0014). Lecturas con Prisma; escrituras en batch directo a D1.
 * Solo lo usa el sync blindado (SYNC_GUARD_ENABLED="true").
 */
// REQ-071, REQ-072, REQ-073, REQ-074, REQ-078
export function createGuardedRepo(prisma: PrismaClient, db: D1Like, newId: () => string = () => crypto.randomUUID()): GuardedRepo {
  const places = createCatalogRepo(prisma, db, newId);

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
      await runBatch(db, [{
        sql: 'DELETE FROM "TourStage" WHERE "runId" NOT IN (SELECT "id" FROM "SyncRun" WHERE "provider" = ? ORDER BY "startedAt" DESC LIMIT ?)',
        params: [PROVIDER, keepRuns],
      }]);
    },

    async storedTours(externalIds) {
      if (externalIds.length === 0) return new Map();
      const rows = await prisma.tour.findMany({
        where: { externalId: { in: externalIds } },
        select: { externalId: true, contentHash: true, rating: true, reviewsNumber: true },
      });
      return new Map(rows.map((r) => [r.externalId, { contentHash: r.contentHash, rating: num(r.rating), reviewsNumber: r.reviewsNumber }]));
    },

    async stage(runId, rows, now) {
      await runBatch(db, stageStatements(runId, rows, now));
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
      const [tours, seen] = await Promise.all([
        prisma.tour.findMany({ select: { externalId: true, syncStatus: true, missingRuns: true, isActive: true } }),
        prisma.tourStage.findMany({ where: { runId }, select: { externalId: true } }),
      ]);
      const seenIds = new Set(seen.map((s) => s.externalId));
      return tours.map((t) => ({ ...t, seen: seenIds.has(t.externalId) }));
    },

    async publish(input) {
      // Respaldo: la fila actual de cada tour que se va a sobrescribir, en el mismo batch que la escritura.
      const ids = input.tours.map((t) => t.tour.externalId);
      const current = ids.length
        ? await prisma.tour.findMany({ where: { externalId: { in: ids } }, select: BACKUP_SELECT })
        : [];
      const backups = current.map((row) => ({
        externalId: row.externalId,
        previous: { ...row, priceValue: num(row.priceValue), rating: num(row.rating), lastSeenAt: sqlValue(row.lastSeenAt), updatedAt: sqlValue(row.updatedAt) },
      }));
      await runBatch(db, publishBatch({ ...input, backups, newId }));
    },
  };
}
