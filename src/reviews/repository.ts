import type { PrismaClient } from "@prisma/client";
import type { ReviewRepo } from "./service";
import { upsertRows, runBatch, type D1Like } from "@/lib/d1/batch";
import type { TourReview } from "./lib/highlights";
import { chunk } from "./lib/chunk";

const REVIEW_COLUMNS = ["id", "tourExternalId", "reviewerName", "language", "title", "content", "rate", "addedAt", "fetchedAt"];

/** Implementación de ReviewRepo sobre D1 (lecturas con Prisma; escrituras en un solo batch). */
export function createReviewRepo(prisma: PrismaClient, db: D1Like): ReviewRepo {
  const toReview = (r: { id: number; reviewerName: string; language: string; title: string | null; content: string | null; rate: number; addedAt: Date }) => ({
    id: r.id, reviewerName: r.reviewerName, language: r.language, title: r.title, content: r.content, rate: r.rate, addedAt: r.addedAt,
  });

  return {
    async getCache(tourExternalId) {
      const row = await prisma.reviewCache.findUnique({ where: { tourExternalId } });
      return row && { fetchedAt: row.fetchedAt, totalObjects: row.totalObjects };
    },

    async listByTour(tourExternalId) {
      const rows = await prisma.review.findMany({ where: { tourExternalId }, orderBy: { addedAt: "desc" }, take: 100 });
      return rows.map(toReview);
    },

    async listRecent(limit) {
      const rows = await prisma.review.findMany({
        where: { rate: { gte: 4 }, content: { not: null } },
        orderBy: { addedAt: "desc" },
        take: limit,
      });
      return rows.map(toReview);
    },

    async listStaleTours(limit, staleBefore) {
      // Candidatos: los tours activos con más reseñas; se descartan los que tienen caché vigente.
      const tours = await prisma.tour.findMany({
        where: { isActive: true, reviewsNumber: { gt: 0 } },
        orderBy: { reviewsNumber: "desc" },
        select: { externalId: true },
        take: 300,
      });
      const ids = tours.map((t) => t.externalId);
      // INC-003/REQ-034: D1 acepta máx. 100 parámetros por consulta; antes iban 300 y el cron fallaba cada minuto.
      const fresh: { tourExternalId: number }[] = [];
      for (const part of chunk(ids, 90)) {
        fresh.push(...(await prisma.reviewCache.findMany({
          where: { tourExternalId: { in: part }, fetchedAt: { gte: staleBefore } },
          select: { tourExternalId: true },
        })));
      }
      const freshIds = new Set(fresh.map((c) => c.tourExternalId));
      return ids.filter((id) => !freshIds.has(id)).slice(0, limit);
    },

    async saveTourReviews(tourExternalId, reviews, totalObjects, fetchedAt) {
      const rows = reviews.map((r) => [r.id, tourExternalId, r.reviewerName, r.language, r.title, r.content, r.rate, r.addedAt, fetchedAt]);
      await runBatch(db, [
        ...upsertRows("Review", REVIEW_COLUMNS, rows, ["id"], REVIEW_COLUMNS.slice(1)),
        ...upsertRows("ReviewCache", ["tourExternalId", "totalObjects", "fetchedAt"], [[tourExternalId, totalObjects, fetchedAt]], ["tourExternalId"], ["totalObjects", "fetchedAt"]),
      ]);
    },
  };
}

/** Lecturas para la prueba social (frases destacadas y reseñas del inicio). Solo lee lo ya guardado. */
export interface HighlightRepo {
  /** Reseñas de 5 ★ con texto de los tours indicados. */
  listFiveStarForTours(tourExternalIds: number[]): Promise<TourReview[]>;
  /** Reseñas de 5 ★ con texto más recientes de cualquier tour. */
  listRecentFiveStar(limit: number): Promise<TourReview[]>;
}

export function createHighlightRepo(prisma: PrismaClient): HighlightRepo {
  const select = { id: true, tourExternalId: true, reviewerName: true, language: true, title: true, content: true, rate: true, addedAt: true } as const;
  const where = { rate: { gte: 5 }, content: { not: null } };
  return {
    async listFiveStarForTours(ids) {
      if (!ids.length) return [];
      return prisma.review.findMany({ where: { ...where, tourExternalId: { in: ids.slice(0, 50) } }, orderBy: { addedAt: "desc" }, take: 500, select });
    },
    async listRecentFiveStar(limit) {
      return prisma.review.findMany({ where, orderBy: { addedAt: "desc" }, take: limit, select });
    },
  };
}
