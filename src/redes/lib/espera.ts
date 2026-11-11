/**
 * REQ-1535: decide si las redes pueden publicar. Función pura: recibe las respuestas de las comprobaciones
 * (artículo y láminas) y dice si todas responden 200. Sin comprobaciones, no hay nada listo (cerrado por omisión).
 */
export type Comprobacion = { url: string; status: number | null };

export function laminasYArticuloListos(comprobaciones: Comprobacion[]): { listo: boolean; faltan: string[] } {
  const faltan = comprobaciones.filter((c) => c.status !== 200).map((c) => c.url);
  return { listo: comprobaciones.length > 0 && faltan.length === 0, faltan };
}
