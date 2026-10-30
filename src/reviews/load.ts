import { getPrisma } from "@/lib/prisma";
import { createFreetourApi } from "@/freetour/api";
import { resolveFreetourConfig } from "@/freetour/lib/hosts";
import { getTourReviews, getHomeReviews } from "./service";
import { createReviewRepo } from "./repository";
import type { Review } from "./lib/reviews";

/** Reseña lista para mandar a un componente de cliente (fecha como texto). */
export interface ReviewView {
  id: number;
  reviewerName: string;
  title: string | null;
  content: string;
  rate: number;
  addedAt: string;
}

const toView = (r: Review): ReviewView => ({
  id: r.id,
  reviewerName: r.reviewerName,
  title: r.title,
  content: r.content ?? "",
  rate: r.rate,
  addedAt: r.addedAt.toISOString(),
});

/** Reseñas reales de un tour. Si algo falla, la página se muestra sin reseñas. */
export async function loadTourReviews(tourExternalId: number, lang: string, limit = 6) {
  try {
    const prisma = getPrisma();
    const { reviews, total } = await getTourReviews(
      { tourExternalId, lang, limit },
      {
        api: createFreetourApi({ config: resolveFreetourConfig(process.env), fetch }),
        repo: createReviewRepo(prisma),
        now: new Date(),
      }
    );
    return { reviews: reviews.map(toView), total };
  } catch (error) {
    console.warn(`[reviews] sin reseñas para el tour ${tourExternalId}:`, (error as Error).message);
    return { reviews: [] as ReviewView[], total: 0 };
  }
}

/** Reseñas recientes para el inicio (solo de la base; no llama a Freetour). */
export async function loadHomeReviews(lang: string, limit = 6): Promise<ReviewView[]> {
  try {
    const reviews = await getHomeReviews({ lang, limit }, { repo: createReviewRepo(getPrisma()) });
    return reviews.map(toView);
  } catch (error) {
    console.warn("[reviews] sin reseñas para el inicio:", (error as Error).message);
    return [];
  }
}
