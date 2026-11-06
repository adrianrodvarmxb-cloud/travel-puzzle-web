/**
 * «★ Favorito de los viajeros» con criterio real (gate 2) y la línea del operador. Pura.
 * Regla del PO: FREETOUR nunca se menciona al cliente.
 */
export const FAVORITE_MIN_RATING = 4.7;
export const FAVORITE_MIN_REVIEWS = 50;

// REQ-098
export function isTravelerFavorite({ rating, reviews }: { rating: number | string | null; reviews: number }): boolean {
  const r = rating === null ? NaN : Number(rating);
  return Number.isFinite(r) && r >= FAVORITE_MIN_RATING && reviews >= FAVORITE_MIN_REVIEWS;
}

const MENTIONS_FREETOUR = /freetour/i;

// REQ-098: «Operado por un guía local · {proveedor}», sin FREETOUR ni logo.
export function operatedBy(provider: string | null | undefined, lang: string): string {
  const base = lang === "es" ? "Operado por un guía local" : "Run by a local guide";
  const name = (provider ?? "").trim();
  return name && !MENTIONS_FREETOUR.test(name) ? `${base} · ${name}` : base;
}
