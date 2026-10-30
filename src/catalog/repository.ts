import type { PrismaClient, Prisma } from "@prisma/client";
import type { CatalogRepo } from "./sync";
import { upsertRows, runBatch, type D1Like } from "@/lib/d1/batch";
import { tourStatements } from "./lib/sql";
import { avoidCodeClashes } from "./lib/tour-rows";

const PROVIDER = "freetour";
const json = (v: unknown) => v as Prisma.InputJsonValue;

/**
 * Implementación de CatalogRepo sobre D1. Las lecturas van por Prisma; las
 * escrituras grandes van en un solo batch directo a D1 (Prisma corta a los 5 s).
 */
export function createCatalogRepo(prisma: PrismaClient, db: D1Like, newId: () => string = () => crypto.randomUUID()): CatalogRepo {
  return {
    async getState() {
      const row = await prisma.syncMetadata.findUnique({ where: { provider: PROVIDER } });
      return row && { status: row.status, nextPage: row.nextPage, totalPages: row.totalPages, runStartedAt: row.runStartedAt };
    },

    async saveState(s) {
      const data = {
        ...(s.status !== undefined && { status: s.status }),
        ...(s.nextPage !== undefined && { nextPage: s.nextPage }),
        ...(s.totalPages !== undefined && { totalPages: s.totalPages }),
        ...(s.runStartedAt !== undefined && { runStartedAt: s.runStartedAt }),
        ...(s.toursCount !== undefined && { toursCount: s.toursCount }),
        lastSyncAt: s.lastSyncAt ?? new Date(),
      };
      await prisma.syncMetadata.upsert({
        where: { provider: PROVIDER },
        update: data,
        create: { provider: PROVIDER, status: "in_progress", toursCount: 0, ...data },
      });
    },

    async existingCountryIds(ids) {
      if (ids.length === 0) return [];
      const rows = await prisma.country.findMany({ where: { id: { in: ids } }, select: { id: true } });
      return rows.map((r) => r.id);
    },

    async existingCityIds(ids) {
      if (ids.length === 0) return [];
      const rows = await prisma.city.findMany({ where: { id: { in: ids } }, select: { id: true } });
      return rows.map((r) => r.id);
    },

    async upsertCountries(input) {
      if (input.length === 0) return;
      const existing = await prisma.country.findMany({ where: { code: { in: input.map((c) => c.code) } }, select: { id: true, code: true } });
      const rows = avoidCodeClashes(input, existing);
      await runBatch(db, upsertRows("Country", ["id", "code", "translations"], rows.map((c) => [c.id, c.code, c.translations]), ["id"], ["code", "translations"]));
    },

    async upsertCities(rows) {
      await runBatch(db, upsertRows("City", ["id", "countryId", "translations"], rows.map((c) => [c.id, c.countryId, c.translations]), ["id"], ["translations"]));
    },

    async upsertTours(rows) {
      await runBatch(db, tourStatements(rows, new Date(), newId));
    },

    async deactivateNotSeenSince(date) {
      const res = await prisma.tour.updateMany({
        where: { isActive: true, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: date } }] },
        data: { isActive: false },
      });
      return res.count;
    },
  };
}
