/**
 * «★ Favorito de los viajeros» con criterio real (gate 2) y la línea del operador. Pura.
 * Regla del PO: FREETOUR nunca se menciona al cliente.
 */
import { mentionsPlatform } from "@/reviews/lib/platform-mention";

/**
 * REQ-098: única fuente de la regla (también la usan src/reviews/lib/highlights.ts y el inicio).
 * Gate actualizado por el PO (6 nov 2026, 14:02): que solo lo tengan unos 140 tours. Con el catálogo
 * de producción del 6 nov (7,841 tours leídos de /tours), ≥4.9 y ≥180 reseñas da 140 tours. Para ajustar:
 * ≥175 da 144 y ≥185 da 134.
 */
export const FAVORITE_MIN_RATING = 4.9;
export const FAVORITE_MIN_REVIEWS = 180;

// REQ-098
export function isTravelerFavorite({ rating, reviews }: { rating: number | string | null; reviews: number }): boolean {
  const r = rating === null ? NaN : Number(rating);
  return Number.isFinite(r) && r >= FAVORITE_MIN_RATING && reviews >= FAVORITE_MIN_REVIEWS;
}

// REQ-616: un solo detector para operador, tarjeta y correos (el de REQ-171: también «free tour .com», sin acentos).
const MENTIONS_FREETOUR = { test: (s: string) => mentionsPlatform(s) };

// REQ-098: «Operado por un guía local · {proveedor}», sin FREETOUR ni logo.
export function operatedBy(provider: string | null | undefined, lang: string): string {
  const base = lang === "es" ? "Operado por un guía local" : "Run by a local guide";
  const name = (provider ?? "").trim();
  return name && !MENTIONS_FREETOUR.test(name) ? `${base} · ${name}` : base;
}
