/** REQ-048/365: qué reconstrucción del índice corre al cerrar el sync (ninguna, la de siempre o con raíces). */
import { isSearchV2 } from "./lib/fts-query";
import { isSearchStem } from "./lib/fts-stem";
import { rebuildTourSearch, rebuildTourSearchStem, type D1Batch, type D1Like } from "./fts-search";

export function searchRebuilder(env: { SEARCH_V2_ENABLED?: string; SEARCH_STEM_ENABLED?: string }, db: () => unknown): (() => Promise<void>) | undefined {
  if (!isSearchV2(env.SEARCH_V2_ENABLED)) return undefined;
  if (isSearchStem(env.SEARCH_STEM_ENABLED)) return async () => { const r = await rebuildTourSearchStem(db() as D1Batch); console.log(`[busqueda] índice con raíces: ${r.rows} filas en español`); };
  return () => rebuildTourSearch(db() as D1Like);
}
