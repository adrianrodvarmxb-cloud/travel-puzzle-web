/**
 * REQ-1090: decide si una red puede publicar un artículo hoy. Puro: el historial llega por parámetro.
 * Reglas: nunca dos veces el mismo artículo en la misma red; como máximo `tope` publicaciones por red al día.
 */
export type Decision = { publicar: true } | { publicar: false; motivo: string };

export function decidirPublicacion(o: { yaPublicadoEnRed: boolean; publicadasHoyEnRed: number; tope?: number }): Decision {
  const tope = o.tope ?? 1;
  if (o.yaPublicadoEnRed) return { publicar: false, motivo: "este artículo ya se publicó en esta red" };
  if (o.publicadasHoyEnRed >= tope) return { publicar: false, motivo: `ya hay ${o.publicadasHoyEnRed} publicación(es) hoy en esta red (tope ${tope})` };
  return { publicar: true };
}
