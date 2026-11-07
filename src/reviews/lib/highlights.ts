/** Prueba social a partir de reseñas reales: etiqueta "Favorito de los viajeros" y frases destacadas. */
import { languageCode, type Review } from "./reviews";
import { mentionsPlatform } from "./platform-mention";

export type TourReview = Review & { tourExternalId: number };

import { FAVORITE_MIN_RATING, FAVORITE_MIN_REVIEWS, isTravelerFavorite as favoriteRule } from "@/tours/lib/favorite";

// REQ-098: la regla vive en un solo lugar (src/tours/lib/favorite.ts); aquí solo se reexporta.
export { FAVORITE_MIN_RATING, FAVORITE_MIN_REVIEWS };

/** El tour se gana la etiqueta solo con datos reales (regla de src/tours/lib/favorite.ts). */
// REQ-1290: delega en la regla única (no repite los umbrales).
export function isTravelerFavorite(rating: number | string | null | undefined, reviews: number): boolean {
  return rating !== null && rating !== undefined && favoriteRule({ rating, reviews });
}

/** Una frase corta de la reseña: la primera oración, o un corte limpio sin romper palabras. */
export function snippet(text: string, max = 110): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const first = clean.match(/^.+?[.!?](?=\s|$)/)?.[0];
  if (first && first.length >= 15 && first.length <= max) return first;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–]+$/, "")}…`;
}

const MIN_LENGTH = 20;

/** Reseñas de 5 ★ con texto útil, primero las del idioma del visitante y las más recientes. */
function usable(reviews: TourReview[], lang: string): TourReview[] {
  const ok = reviews
    // REQ-171: ni frases destacadas ni reseñas del inicio que nombran la plataforma.
    .filter((r) => r.rate >= 5 && (r.content ?? "").trim().length >= MIN_LENGTH && !mentionsPlatform(r.title) && !mentionsPlatform(r.content))
    .sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
  return [...ok.filter((r) => languageCode(r.language) === lang), ...ok.filter((r) => languageCode(r.language) !== lang)];
}

/** Una frase destacada por tour (tourExternalId → frase), solo en el idioma del visitante. */
export function pickHighlights(reviews: TourReview[], lang: string): Map<number, { text: string; reviewerName: string }> {
  const out = new Map<number, { text: string; reviewerName: string }>();
  for (const r of usable(reviews, lang).filter((x) => languageCode(x.language) === lang)) {
    if (!out.has(r.tourExternalId)) out.set(r.tourExternalId, { text: snippet(r.content ?? ""), reviewerName: r.reviewerName });
  }
  return out;
}

/** Reseñas del inicio: de 5 ★ y cada una de un tour distinto. */
export function pickDistinctTourReviews(reviews: TourReview[], lang: string, limit: number): TourReview[] {
  const seen = new Set<number>();
  const out: TourReview[] = [];
  for (const r of usable(reviews, lang)) {
    if (seen.has(r.tourExternalId)) continue;
    seen.add(r.tourExternalId);
    out.push(r);
    if (out.length === limit) break;
  }
  return out;
}
