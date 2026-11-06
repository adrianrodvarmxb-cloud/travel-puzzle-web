/**
 * REQ-185, REQ-188: qué entra a los carruseles «Los más elegidos» y «Excursiones de un día» del home (puro).
 * Las candidatas llegan de cualquier proveedor (FREETOUR, viajes propios/DMC, Big Bus…) con su formato ya calculado.
 */
import { diversify, hasRealReviews, rankByReviews, type Cap, type Prior } from "./review-score";
import { isOnSiteForRanking, type ExperienceFormat } from "./experience-format";

export const HOME_CAROUSEL_SIZE = 9;
/** REQ-188: lugares al final de «Excursiones de un día» para proveedores sin sistema de reseñas (0 = excluirlos). */
export const DAY_TRIP_UNRATED_SLOTS = 2;

export interface RankCandidate {
  key: string;
  city: string;
  country: string;
  format: ExperienceFormat;
  rating: number | null;
  reviews: number;
  /** El proveedor tiene reseñas (FREETOUR sí; los viajes propios hoy no). */
  hasReviewSystem: boolean;
  dayTrip: boolean;
}

/** REQ-185: máx. 2 por ciudad y 3 por formato en las primeras posiciones (se relaja primero el formato). */
const MOST_CHOSEN_CAPS: Cap<RankCandidate>[] = [{ of: (t) => t.city, max: 2 }, { of: (t) => t.format, max: 3 }];
/** REQ-188: 1 por ciudad y 2 por país en las primeras posiciones (se relaja primero el país). */
const DAY_TRIP_CAPS: Cap<RankCandidate>[] = [{ of: (t) => t.city, max: 1 }, { of: (t) => t.country, max: 2 }];

// REQ-185
export function pickMostChosen<T extends RankCandidate>(items: readonly T[], prior: Prior, n = HOME_CAROUSEL_SIZE): T[] {
  return diversify(rankByReviews(items.filter((t) => isOnSiteForRanking(t.format)), prior), n, MOST_CHOSEN_CAPS);
}

// REQ-188
export function pickDayTrips<T extends RankCandidate>(items: readonly T[], prior: Prior, n = HOME_CAROUSEL_SIZE, unratedSlots = DAY_TRIP_UNRATED_SLOTS): T[] {
  const pool = items.filter((t) => t.dayTrip && isOnSiteForRanking(t.format));
  const rated = diversify(rankByReviews(pool, prior), n, DAY_TRIP_CAPS);
  const unrated = diversify(pool.filter((t) => !t.hasReviewSystem && !hasRealReviews(t)), n, DAY_TRIP_CAPS);
  const ratedShown = rated.slice(0, Math.max(n - Math.min(unratedSlots, unrated.length), 0));
  return [...ratedShown, ...unrated.slice(0, n - ratedShown.length)];
}
