import type { PrismaClient, Prisma } from "@prisma/client";
import type { CatalogRepo } from "./sync";

const PROVIDER = "freetour";
const json = (v: unknown) => v as Prisma.InputJsonValue;

/** Implementación de CatalogRepo con Prisma sobre D1. Usa lotes ($transaction) para minimizar viajes. */
export function createCatalogRepo(prisma: PrismaClient): CatalogRepo {
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

    async upsertCountries(rows) {
      await prisma.$transaction(
        rows.map((c) =>
          prisma.country.upsert({
            where: { id: c.id },
            update: { code: c.code, translations: json(c.translations) },
            create: { id: c.id, code: c.code, translations: json(c.translations) },
          })
        )
      );
    },

    async upsertCities(rows) {
      await prisma.$transaction(
        rows.map((c) =>
          prisma.city.upsert({
            where: { id: c.id },
            update: { translations: json(c.translations) },
            create: { id: c.id, countryId: c.countryId, translations: json(c.translations) },
          })
        )
      );
    },

    async upsertTours(rows) {
      const tours = await prisma.$transaction(
        rows.map(({ tour }) => {
          const data = { ...tour, meetingPoint: json(tour.meetingPoint), includes: json(tour.includes), POIs: json(tour.POIs), images: json(tour.images) };
          return prisma.tour.upsert({ where: { externalId: tour.externalId }, update: data, create: data, select: { id: true, externalId: true } });
        })
      );
      const idByExternal = new Map(tours.map((t) => [t.externalId, t.id]));
      await prisma.$transaction(
        rows.flatMap(({ tour, translations }) =>
          translations.map((tr) => {
            const tourId = idByExternal.get(tour.externalId)!;
            return prisma.tourTranslation.upsert({
              where: { tourId_language: { tourId, language: tr.language } },
              update: { title: tr.title, brief: tr.brief, description: tr.description, url: tr.url },
              create: { tourId, ...tr },
            });
          })
        )
      );
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
