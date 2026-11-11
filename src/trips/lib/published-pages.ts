/**
 * REQ-1344 (INC-008): lectura completa de los viajes publicados, por páginas con cursor (sin tope), y armado de cada
 * viaje desde la fila ya leída (sin releerlo: antes eran 1 + N consultas). Puro: la consulta llega por parámetro.
 */
export const PUBLISHED_PAGE_SIZE = 100;

// REQ-1344
export async function readAllPages<T extends { id: string }>(fetchPage: (cursor: string | null, size: number) => Promise<T[]>, size = PUBLISHED_PAGE_SIZE): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | null = null;
  for (;;) {
    const page = await fetchPage(cursor, size);
    out.push(...page);
    if (page.length < size) return out;
    const last = page[page.length - 1].id;
    if (last === cursor) return out; // nunca ciclar si la fuente repite
    cursor = last;
  }
}

/** REQ-1344 + blindaje 8: un registro que no se puede leer se descarta y se registra; los demás siguen. */
export function rowsToTrips<R extends { id: string }, T>(rows: readonly R[], toTrip: (r: R) => T, log: (id: string, message: string) => void): T[] {
  return rows.flatMap((r) => {
    try {
      return [toTrip(r)];
    } catch (e) {
      log(r.id, (e as Error).message);
      return [];
    }
  });
}
