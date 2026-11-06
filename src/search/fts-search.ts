/** REQ-048: búsqueda FTS5 en D1. Recibe la base por parámetro (DIP); la ruta arma las dependencias. */
import { ftsQueries, REBUILD_SQL, SEARCH_SQL } from "./lib/fts-query";
import { ftsStemQueries, REBUILD_STEM_SQL, SEARCH_STEM_SQL, STEM_SOURCE_SQL, STEM_UPDATE_SQL, stemText } from "./lib/fts-stem";
import type { SynonymMap } from "./lib/synonyms";

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

// ── S6 (REQ-363…365): raíz y sinónimos, tras SEARCH_STEM_ENABLED ─────────────────────────────────────────────

/** D1 con `batch` (varias sentencias en una ida). */
export interface D1Batch extends D1Like {
  batch?(statements: unknown[]): Promise<unknown>;
}
export const STEM_BATCH = 100;

/** Como searchTourIds, con raíz y sinónimos (requiere la columna stem). */
// REQ-363 REQ-364
export async function searchTourIdsStem(db: D1Like, language: string, text: string, synonyms: SynonymMap, limit = SEARCH_LIMIT, place?: string | null): Promise<string[] | null> {
  const queries = ftsStemQueries(text, place, synonyms);
  if (!queries.length) return null;
  for (const q of queries) {
    const { results } = await db.prepare(SEARCH_STEM_SQL).bind(q, language, limit).all();
    if (results.length) return results.map((r) => String(r.tourId));
  }
  return [];
}

/** Rehace el índice con raíces: INSERT…SELECT en D1 y luego las raíces de las filas en español, en lotes. */
// REQ-365
export async function rebuildTourSearchStem(db: D1Batch): Promise<{ rows: number }> {
  for (const sql of REBUILD_STEM_SQL) await db.prepare(sql).bind().run();
  const { results } = await db.prepare(STEM_SOURCE_SQL).bind().all();
  const updates = results.map((r) => db.prepare(STEM_UPDATE_SQL).bind(stemText(`${r.title ?? ""} ${r.brief ?? ""}`), Number(r.rid)));
  for (let i = 0; i < updates.length; i += STEM_BATCH) {
    const chunk = updates.slice(i, i + STEM_BATCH);
    if (db.batch) await db.batch(chunk);
    else for (const st of chunk) await st.run();
  }
  return { rows: updates.length };
}
