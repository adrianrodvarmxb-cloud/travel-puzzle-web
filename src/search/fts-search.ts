/** REQ-048: búsqueda FTS5 en D1. Recibe la base por parámetro (DIP); la ruta arma las dependencias. */
import { ftsQueries, REBUILD_SQL, SEARCH_SQL } from "./lib/fts-query";

export interface D1Like {
  prepare(sql: string): { bind(...v: unknown[]): { all(): Promise<{ results: Record<string, unknown>[] }>; run(): Promise<unknown> } };
}

export const SEARCH_LIMIT = 1000;

/**
 * Ids de tours por relevancia, o null si el texto no tiene palabras buscables.
 * REQ-122: prueba las consultas en orden (exacta → prefijo en la última → prefijo en todas) y se queda con la
 * primera que encuentre algo; `place` limita la búsqueda a un destino (columna del lugar).
 */
// REQ-048 REQ-122
export async function searchTourIds(db: D1Like, language: string, text: string, limit = SEARCH_LIMIT, place?: string | null): Promise<string[] | null> {
  const queries = ftsQueries(text, place);
  if (!queries.length) return null;
  for (const q of queries) {
    const { results } = await db.prepare(SEARCH_SQL).bind(q, language, limit).all();
    if (results.length) return results.map((r) => String(r.tourId));
  }
  return [];
}

/** Rehace el índice completo (después del sync diario). Dos sentencias; el INSERT…SELECT corre dentro de D1. */
// REQ-048
export async function rebuildTourSearch(db: D1Like): Promise<void> {
  for (const sql of REBUILD_SQL) await db.prepare(sql).bind().run();
}
