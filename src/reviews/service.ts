import { parseReviewsResponse, isCacheFresh, pickReviews, REVIEW_CACHE_DAYS, type Review } from "./lib/reviews";

/** Lo que el servicio necesita de la base (implementado con Prisma en repository.ts). */
export interface ReviewRepo {
  getCache(tourExternalId: number): Promise<{ fetchedAt: Date; totalObjects: number } | null>;
  listByTour(tourExternalId: number): Promise<Review[]>;
  listRecent(limit: number): Promise<Review[]>;
  saveTourReviews(tourExternalId: number, reviews: Review[], totalObjects: number, fetchedAt: Date): Promise<void>;
  /** Tours activos con más reseñas cuya caché no existe o es anterior a staleBefore. */
  listStaleTours(limit: number, staleBefore: Date): Promise<number[]>;
}

interface Api {
  get(path: string, opts?: { version?: "2.0" | "2.1" }): Promise<unknown>;
}

/** Pide a Freetour las 100 reseñas más recientes del tour y las guarda (lanza si falla). */
async function fetchAndSave(tourExternalId: number, { api, repo, now }: { api: Api; repo: ReviewRepo; now: Date }) {
  const body = await api.get(`/tours/${tourExternalId}/reviews?page=1&sort=desc`, { version: "2.1" });
  const parsed = parseReviewsResponse(body);
  await repo.saveTourReviews(tourExternalId, parsed.reviews, parsed.totalObjects, now);
  return parsed;
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
      const { reviews, totalObjects } = await fetchAndSave(tourExternalId, { api, repo, now });
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

/**
 * Actualiza por adelantado las reseñas de los tours más reseñados (lo llama el
 * cron cuando ya terminó el catálogo). Así el inicio y las páginas de tour
 * tienen reseñas reales listas sin esperar a Freetour.
 */
export async function refreshStaleReviews({ batch }: { batch: number }, { api, repo, now }: { api: Api; repo: ReviewRepo; now: Date }) {
  const staleBefore = new Date(now.getTime() - REVIEW_CACHE_DAYS * 24 * 60 * 60 * 1000);
  const ids = await repo.listStaleTours(batch, staleBefore);
  let refreshed = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await fetchAndSave(id, { api, repo, now });
      refreshed++;
    } catch (error) {
      failed++;
      console.warn(`[reviews] falló la actualización del tour ${id}:`, (error as Error).message);
    }
  }
  return { refreshed, failed };
}
