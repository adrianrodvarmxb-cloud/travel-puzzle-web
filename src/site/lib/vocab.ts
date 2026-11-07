/**
 * REQ-244: vocabulario prohibido de las páginas institucionales y del blog. Puro.
 * Suma a la línea de comunicación (docs/linea-comunicacion.md) lo que el PO rechazó el 6 nov 2026:
 * «expertos» (los viajes son de proveedores; se dice «asesores de viaje»), garantías que no están en los T&C
 * y los nombres de proveedores (nunca se presentan como operadores de Travel Puzzle).
 */
export const PROHIBIDAS_SITIO =
  /free ?tour\.com|freetour|(?<!\p{L})(reales?|real|miles|thousands|increíbles?|amazing|garantizad[oa]s?|guaranteed|garantías?|guarantee|el mejor|los mejores|la mejor|mejor precio|the best|únic[oa]s?|the only|expert[oa]s?|experts?)(?!\p{L})|inca ?world|fant[aá]stica china|big ?bus|kiwitaxi|civitatis|getyourguide|guruwalk|klook|travelpayouts/iu;

/** Todas las cadenas de un objeto (para revisar el copy completo en un test). */
export function textsOf(obj: unknown): string[] {
  if (typeof obj === "string") return [obj];
  if (Array.isArray(obj)) return obj.flatMap(textsOf);
  if (obj && typeof obj === "object") return Object.values(obj).flatMap(textsOf);
  return [];
}
