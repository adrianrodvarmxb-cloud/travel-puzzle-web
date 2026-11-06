/** Qué viajes entran al carrusel del home «Viajes armados por nuestros expertos» (puro). */

export const HOME_CAROUSEL_MAX = 9;

/**
 * REQ-153: el transporte complementa a los tours, no es un viaje armado por expertos;
 * se ve en /tours y en la venta cruzada, no en este carrusel. El tope se aplica después de filtrar.
 */
export function homeCarouselTrips<T extends { kind: string }>(trips: readonly T[], max = HOME_CAROUSEL_MAX): T[] {
  return trips.filter((t) => t.kind !== "transporte").slice(0, max);
}
