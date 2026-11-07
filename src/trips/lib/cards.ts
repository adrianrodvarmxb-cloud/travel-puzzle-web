/**
 * REQ-268: une cada viaje leído con su fila por id (no por posición). Si un viaje no se pudo leer (null), se omite
 * sin desalinear las traducciones ni la fecha de alta de los demás. Puro.
 */
export function pairById<R extends { id: string }, T extends { id: string }>(rows: readonly R[], trips: readonly (T | null | undefined)[]): { row: R; trip: T }[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return trips.flatMap((t) => {
    const row = t ? byId.get(t.id) : undefined;
    return t && row ? [{ row, trip: t }] : [];
  });
}
