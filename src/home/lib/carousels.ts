/**
 * REQ-450, REQ-453: qué entra a los carruseles «Los más elegidos» y «Excursiones de un día» del home (puro).
 * Las candidatas llegan de cualquier proveedor (FREETOUR, viajes propios/DMC, Big Bus…) con su formato ya calculado.
 */
import { diversify, ensureEachGroup, hasRealReviews, rankByReviews, rankWithPrior, type Cap, type Prior } from "./review-score";
import { isOnSiteForRanking, type ExperienceFormat } from "./experience-format";
import type { FormatoOEstado } from "@/taxonomy/lib/types";

export const HOME_CAROUSEL_SIZE = 9;
/** REQ-453 (gate C6): lugares al final de «Excursiones de un día» para proveedores sin sistema de reseñas (0 = excluirlos). Desde REQ-10515 solo se usa con `UNRATED_ENTER_BY_PRIOR = false`. */
export const DAY_TRIP_UNRATED_SLOTS = 2;
/**
 * REQ-10515 (PO 13-11 16:00, opción A): lo que no tiene reseñas entra por puntaje del prior (C) en los dos carruseles,
 * tenga o no sistema de reseñas su proveedor. `false` = regresar a la regla anterior (REQ-450 solo con reseñas reales,
 * gate C6 con lugares al final) sin tocar más código.
 */
export const UNRATED_ENTER_BY_PRIOR = true;
/** REQ-10516: en la primera página (12) ningún proveedor ocupa más de 8 (dos tercios); el resto queda para los demás. */
export const PROVIDER_CAP = 8;
/** REQ-10515: proveedor que se asume cuando la fila no lo trae (valor por defecto de la base). */
export const DEFAULT_RANK_PROVIDER = "freetour";

export interface RankCandidate {
  key: string;
  city: string;
  country: string;
  /** Formato de la regla temporal (REQ-451) o de la taxonomía (REQ-10515). */
  format: ExperienceFormat | FormatoOEstado;
  rating: number | null;
  reviews: number;
  /** El proveedor tiene reseñas (FREETOUR sí; los viajes propios hoy no). */
  hasReviewSystem: boolean;
  dayTrip: boolean;
  /** REQ-10516: proveedor (Tour.providerId o agencyId del viaje); sin él, freetour. Nunca llega al cliente. */
  providerId?: string;
}

// REQ-10516
export const providerOf = (t: RankCandidate): string => t.providerId ?? DEFAULT_RANK_PROVIDER;

/**
 * Topes de la primera página. El del proveedor va PRIMERO para que `diversify` lo relaje al ÚLTIMO: antes de dar
 * una novena tarjeta a un proveedor se acepta repetir ciudad o formato (REQ-10516). Con un solo proveedor se relaja
 * y la página se llena como antes.
 */
export const PROVIDER_CAP_RULE: Cap<RankCandidate> = { of: providerOf, max: PROVIDER_CAP };
/** REQ-450: máx. 2 por ciudad y 3 por formato en las primeras posiciones (se relaja primero el formato). */
const MOST_CHOSEN_CAPS: Cap<RankCandidate>[] = [{ of: (t) => t.city, max: 2 }, { of: (t) => t.format, max: 3 }];
/** REQ-453: 1 por ciudad y 2 por país en las primeras posiciones (se relaja primero el país). */
const DAY_TRIP_CAPS: Cap<RankCandidate>[] = [{ of: (t) => t.city, max: 1 }, { of: (t) => t.country, max: 2 }];

/**
 * REQ-10516: una PÁGINA (n finito) lleva además el tope por proveedor y la garantía de que cada proveedor con
 * candidatos aparece al menos una vez. Con n infinito (el orden completo para las páginas siguientes) no: ahí manda
 * el puntaje con la diversidad de siempre, como pide el PO («las páginas siguientes siguen por puntaje»).
 */
// REQ-10516
export function pickPage<T extends RankCandidate>(ranked: readonly T[], n: number, caps: readonly Cap<RankCandidate>[]): T[] {
  if (!Number.isFinite(n)) return diversify(ranked, n, caps);
  return ensureEachGroup(diversify(ranked, n, [PROVIDER_CAP_RULE, ...caps]), ranked, providerOf);
}

// REQ-450
// REQ-10515: sin reseñas entran con el puntaje del prior; REQ-10516: tope por proveedor en la primera página.
export function pickMostChosen<T extends RankCandidate>(items: readonly T[], prior: Prior, n = HOME_CAROUSEL_SIZE): T[] {
  const pool = items.filter((t) => isOnSiteForRanking(t.format));
  return pickPage(UNRATED_ENTER_BY_PRIOR ? rankWithPrior(pool, prior) : rankByReviews(pool, prior), n, MOST_CHOSEN_CAPS);
}

// REQ-453
// REQ-10515: sin reseñas entran con el puntaje del prior (gate C6 REEMPLAZADO); REQ-10516: tope por proveedor.
export function pickDayTrips<T extends RankCandidate>(items: readonly T[], prior: Prior, n = HOME_CAROUSEL_SIZE, unratedSlots = DAY_TRIP_UNRATED_SLOTS): T[] {
  const pool = items.filter((t) => t.dayTrip && isOnSiteForRanking(t.format));
  if (UNRATED_ENTER_BY_PRIOR) return pickPage(rankWithPrior(pool, prior), n, DAY_TRIP_CAPS);
  // Regla anterior (gate C6), conservada de forma reversible.
  const rated = diversify(rankByReviews(pool, prior), n, DAY_TRIP_CAPS);
  const unrated = diversify(pool.filter((t) => !t.hasReviewSystem && !hasRealReviews(t)), n, DAY_TRIP_CAPS);
  const ratedShown = rated.slice(0, Math.max(n - Math.min(unratedSlots, unrated.length), 0));
  return [...ratedShown, ...unrated.slice(0, n - ratedShown.length)];
}
