import { parseReviewsResponse, isCacheFresh, pickReviews, type Review } from "./lib/reviews";

/** Lo que el servicio necesita de la base (implementado con Prisma en repository.ts). */
export interface ReviewRepo {
  getCache(tourExternalId: number): Promise<{ fetchedAt: Date; totalObjects: number } | null>;
  listByTour(tourExternalId: number): Promise<Review[]>;
  listRecent(limit: number): Promise<Review[]>;
  saveTourReviews(tourExternalId: number, reviews: Review[], totalObjects: number, fetchedAt: Date): Promise<void>;
}

interface Api {
  get(path: string, opts?: { version?: "2.0" | "2.1" }): Promise<unknown>;
}

/**
 * Reseñas de un tour para su página. Usa la caché de 7 días; si venció,
 * pide a Freetour las 100 más recientes. Si Freetour falla, muestra la caché.
 */
export async function getTourReviews(
  { tourExternalId, lang, limit }: { tourExternalId: number; lang: string; limit: number },
  { api, repo, now }: { api: Api; repo: ReviewRepo; now: Date }
): Promise<{ reviews: Review[]; total: number }> {
  const cache = await repo.getCache(tourExternalId);
  if (!isCacheFresh(cache?.fetchedAt ?? null, now)) {
    try {
      const body = await api.get(`/tours/${tourExternalId}/reviews?page=1&sort=desc`, { version: "2.1" });
      const { reviews, totalObjects } = parseReviewsResponse(body);
      await repo.saveTourReviews(tourExternalId, reviews, totalObjects, now);
      return { reviews: pickReviews(reviews, { lang, limit }), total: totalObjects };
    } catch (error) {
      console.warn(`[reviews] no se pudieron actualizar las reseñas del tour ${tourExternalId}:`, (error as Error).message);
    }
  }
  const stored = await repo.listByTour(tourExternalId);
  return { reviews: pickReviews(stored, { lang, limit }), total: cache?.totalObjects ?? stored.length };
}

/** Reseñas recientes para la sección de inicio (solo lo ya guardado; no llama a Freetour). */
export async function getHomeReviews({ lang, limit }: { lang: string; limit: number }, { repo }: { repo: ReviewRepo }) {
  return pickReviews(await repo.listRecent(limit * 10), { lang, limit });
}
