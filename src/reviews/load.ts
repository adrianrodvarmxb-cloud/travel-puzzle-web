import { getPrisma, getD1 } from "@/lib/prisma";
import { createFreetourApi } from "@/freetour/api";
import { resolveFreetourConfig } from "@/freetour/lib/hosts";
import { getTourReviews, getHomeReviews } from "./service";
import { createReviewRepo, createHighlightRepo } from "./repository";
import { pickHighlights } from "./lib/highlights";
import type { Review } from "./lib/reviews";

/** Reseña lista para mandar a un componente de cliente (fecha como texto). */
export interface ReviewView {
  id: number | string;
  /** Reseña de un cliente de Travel Puzzle (aprobada). */
  verified?: boolean;
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
        repo: createReviewRepo(prisma, getD1()),
        now: new Date(),
      }
    );
    const ours = await loadVerifiedReviews(tourExternalId);
    return { reviews: [...ours, ...reviews.map(toView)], total: total + ours.length };
  } catch (error) {
    console.warn(`[reviews] sin reseñas para el tour ${tourExternalId}:`, (error as Error).message);
    // Si Freetour falla, al menos las de nuestros clientes.
    const ours = await loadVerifiedReviews(tourExternalId);
    return { reviews: ours, total: ours.length };
  }
}

/** Reseñas recientes para el inicio (solo de la base; no llama a Freetour). */
export async function loadHomeReviews(lang: string, limit = 6): Promise<ReviewView[]> {
  try {
    const reviews = await getHomeReviews({ lang, limit }, { repo: createReviewRepo(getPrisma(), getD1()) });
    return reviews.map(toView);
  } catch (error) {
    console.warn("[reviews] sin reseñas para el inicio:", (error as Error).message);
    return [];
  }
}

/** Frase destacada (reseña real de 5 ★) de cada tour de la lista. Si algo falla, las tarjetas salen sin frase. */
export async function loadTourHighlights(tourExternalIds: number[], lang: string): Promise<Record<number, { text: string; reviewerName: string }>> {
  try {
    const reviews = await createHighlightRepo(getPrisma()).listFiveStarForTours(tourExternalIds);
    return Object.fromEntries(pickHighlights(reviews, lang));
  } catch (error) {
    console.warn("[reviews] sin frases destacadas:", (error as Error).message);
    return {};
  }
}

/** Reseñas aprobadas de clientes de Travel Puzzle; van primero en la ficha. Si la tabla no existe aún, ninguna. */
async function loadVerifiedReviews(tourExternalId: number): Promise<ReviewView[]> {
  try {
    const { listPublishedReviews } = await import("./customer-deps");
    const rows = await listPublishedReviews(tourExternalId);
    return rows.map((r) => ({
      id: r.id,
      verified: true,
      reviewerName: r.displayName,
      title: null,
      content: r.content,
      rate: r.rate,
      addedAt: r.createdAt.toISOString(),
    }));
  } catch (error) {
    console.warn("[reviews] sin reseñas verificadas:", (error as Error).message);
    return [];
  }
}
