import type { PrismaClient } from "@prisma/client";
import type { ReviewRepo } from "./service";

/** Implementación de ReviewRepo con Prisma sobre D1. */
export function createReviewRepo(prisma: PrismaClient): ReviewRepo {
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

    async saveTourReviews(tourExternalId, reviews, totalObjects, fetchedAt) {
      await prisma.$transaction([
        ...reviews.map((r) =>
          prisma.review.upsert({
            where: { id: r.id },
            update: { ...r, tourExternalId, fetchedAt },
            create: { ...r, tourExternalId, fetchedAt },
          })
        ),
        prisma.reviewCache.upsert({
          where: { tourExternalId },
          update: { totalObjects, fetchedAt },
          create: { tourExternalId, totalObjects, fetchedAt },
        }),
      ]);
    },
  };
}
