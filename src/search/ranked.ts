/**
 * REQ-048: ids por relevancia para el buscador de /tours (I/O). Tras SEARCH_V2_ENABLED.
 * Caché compartida por idioma y consulta (como el catálogo, REQ-032) para no cargar D1 en picos (INC-003);
 * cualquier falla regresa null y el catálogo usa su búsqueda por palabras.
 */
import { getD1 } from "@/lib/prisma";
import { cached, cacheKey, POLICY } from "@/cache/edge";
import { withRetry } from "@/tours/lib/d1-load";
import { ftsQueries, isSearchV2, rankedOrFallback } from "./lib/fts-query";
import { searchTourIds, searchTourIdsStem, type D1Like } from "./fts-search";
import { ftsStemQueries, isSearchStem, STEM_VERSION } from "./lib/fts-stem";
import { searchSynonyms } from "./synonyms";

/** REQ-122: `place` = destino reconocido en el texto (el resto se busca dentro de él). */
export async function rankedTourIds(language: string, text: string | undefined, place?: string | null): Promise<string[] | null> {
  if (!text || !isSearchV2(process.env.SEARCH_V2_ENABLED)) return null;
  // REQ-363…365: con SEARCH_STEM_ENABLED (requiere la columna stem), raíz y sinónimos; apagada, lo de siempre
  const stem = isSearchStem(process.env.SEARCH_STEM_ENABLED);
  const q = stem ? ftsStemQueries(text, place, searchSynonyms())[0] : ftsQueries(text, place)[0];
  if (!q) return null;
  try {
    const ids = await cached(cacheKey("fts", stem ? { language, q, v: `3.${STEM_VERSION}` } : { language, q, v: "2" }), POLICY.toursList, () =>
      withRetry(async () => (stem
        ? await searchTourIdsStem(getD1() as unknown as D1Like, language, text, searchSynonyms(), undefined, place)
        : await searchTourIds(getD1() as unknown as D1Like, language, text, undefined, place)) ?? []));
    return rankedOrFallback(ids);
  } catch (error) {
    console.error("[busqueda] FTS no disponible, se usa la búsqueda por palabras:", (error as Error).message);
    return null;
  }
}
