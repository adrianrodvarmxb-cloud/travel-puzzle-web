/**
 * REQ-1575: enlace de una tarjeta del mapa. Va aparte de `trips.ts` para que la tarjeta (cliente) no arrastre el
 * catálogo, el diccionario de la taxonomía ni zod (REQ-10865). `trips.ts` lo re-exporta.
 */
// REQ-1575
export const cardHref = (t: { id: string; href?: string }) => t.href ?? `/tours/${t.id}`;
