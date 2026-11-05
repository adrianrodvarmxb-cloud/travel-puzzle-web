/** REQ-048: búsqueda FTS5 en D1. Recibe la base por parámetro (DIP); la ruta arma las dependencias. */
import { ftsQuery, REBUILD_SQL, SEARCH_SQL } from "./lib/fts-query";

export interface D1Like {
  prepare(sql: string): { bind(...v: unknown[]): { all(): Promise<{ results: Record<string, unknown>[] }>; run(): Promise<unknown> } };
}

export const SEARCH_LIMIT = 1000;

/** Ids de tours por relevancia, o null si el texto no tiene palabras buscables. */
// REQ-048
export async function searchTourIds(db: D1Like, language: string, text: string, limit = SEARCH_LIMIT): Promise<string[] | null> {
  const q = ftsQuery(text);
  if (!q) return null;
  const { results } = await db.prepare(SEARCH_SQL).bind(q, language, limit).all();
  return results.map((r) => String(r.tourId));
}

/** Rehace el índice completo (después del sync diario). Dos sentencias; el INSERT…SELECT corre dentro de D1. */
// REQ-048
export async function rebuildTourSearch(db: D1Like): Promise<void> {
  for (const sql of REBUILD_SQL) await db.prepare(sql).bind().run();
}
