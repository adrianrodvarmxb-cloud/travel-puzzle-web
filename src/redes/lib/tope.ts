/**
 * REQ-1090: decide si una red puede publicar un artículo. Puro: el historial llega por parámetro.
 * Regla: nunca dos veces el mismo artículo en la misma red. Sin límite diario.
 */
export type Decision = { publicar: true } | { publicar: false; motivo: string };

export function decidirPublicacion(o: { yaPublicadoEnRed: boolean }): Decision {
  if (o.yaPublicadoEnRed) return { publicar: false, motivo: "este artículo ya se publicó en esta red" };
  return { publicar: true };
}
