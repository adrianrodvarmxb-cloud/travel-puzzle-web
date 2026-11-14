/**
 * Nota del proveedor visible o solo interna (decisión 18 del plan de la ficha única, REQ-10596; código REQ-10652).
 * Firma del PO (14 nov 2026): «C, se solicita el detalle a Tangol para poder mostrarlo». Hasta que Tangol mande
 * el detalle de sus reseñas, su nota y su conteo no se muestran en la ficha ni en las tarjetas; el dato se sigue
 * guardando y se usa por dentro para ordenar (las consultas ordenan con la columna, no con lo que sale de aquí).
 * Pura: sin I/O, sin reloj y sin idioma.
 */

/** Proveedores cuya nota y conteo quedan solo internos. Reversible: quitar al proveedor de la lista. */
const HIDDEN_RATING_PROVIDERS = new Set(["tangol"]);

export interface PublicRating {
  rating: number | null;
  reviews: number;
}

/** ¿La nota de este proveedor se muestra al visitante? El primer proveedor (sin providerId) sigue como hoy. */
// REQ-10652
export function showsProviderRating(providerId: string | null | undefined): boolean {
  const id = providerId?.trim().toLowerCase();
  return !id || !HIDDEN_RATING_PROVIDERS.has(id);
}

/**
 * Nota y conteo que llegan a la pantalla. Para un proveedor oculto: sin nota y cero reseñas, así ninguna
 * pieza (estrellas, conteo, «Favorito de los viajeros», meta del título) tiene con qué pintarse.
 */
// REQ-10652
export function publicRating<R extends number | string | null | undefined>(
  providerId: string | null | undefined,
  rating: R,
  reviews: number | null | undefined,
): { rating: R | null; reviews: number } {
  return withHiddenRating(!showsProviderRating(providerId), rating, reviews);
}

/**
 * Misma regla cuando la fila ya no trae el providerId sino solo la marca de «nota oculta» (el inicio no manda el
 * providerId al navegador, REQ-10517; manda `ratingHidden`).
 */
// REQ-10652
export function withHiddenRating<R extends number | string | null | undefined>(
  hidden: boolean | undefined,
  rating: R,
  reviews: number | null | undefined,
): { rating: R | null; reviews: number } {
  if (hidden) return { rating: null, reviews: 0 };
  return { rating, reviews: Number(reviews ?? 0) };
}
