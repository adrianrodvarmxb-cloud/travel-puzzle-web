/**
 * REQ-048: ids por relevancia para el buscador de /tours (I/O). Tras SEARCH_V2_ENABLED.
 * Caché compartida por idioma y consulta (como el catálogo, REQ-032) para no cargar D1 en picos (INC-003);
 * cualquier falla regresa null y el catálogo usa su búsqueda por palabras.
 */
import { getD1 } from "@/lib/prisma";
import { cached, cacheKey, POLICY } from "@/cache/edge";
import { withRetry } from "@/tours/lib/d1-load";
import { ftsQueries, isSearchV2, rankedOrFallback } from "./lib/fts-query";
import { searchTourIds, type D1Like } from "./fts-search";

/** REQ-122: `place` = destino reconocido en el texto (el resto se busca dentro de él). */
export async function rankedTourIds(language: string, text: string | undefined, place?: string | null): Promise<string[] | null> {
  if (!text || !isSearchV2(process.env.SEARCH_V2_ENABLED)) return null;
  const q = ftsQueries(text, place)[0];
  if (!q) return null;
  try {
    const ids = await cached(cacheKey("fts", { language, q, v: "2" }), POLICY.toursList, () =>
      withRetry(async () => (await searchTourIds(getD1() as unknown as D1Like, language, text, undefined, place)) ?? []));
    return rankedOrFallback(ids);
  } catch (error) {
    console.error("[busqueda] FTS no disponible, se usa la búsqueda por palabras:", (error as Error).message);
    return null;
  }
}
