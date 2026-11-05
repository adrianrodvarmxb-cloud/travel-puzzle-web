/**
 * REQ-048: ids por relevancia para el buscador de /tours (I/O). Tras SEARCH_V2_ENABLED.
 * Caché compartida por idioma y consulta (como el catálogo, REQ-032) para no cargar D1 en picos (INC-003);
 * cualquier falla regresa null y el catálogo usa su búsqueda por palabras.
 */
import { getD1 } from "@/lib/prisma";
import { cached, cacheKey, POLICY } from "@/cache/edge";
import { withRetry } from "@/tours/lib/d1-load";
import { ftsQuery, isSearchV2, rankedOrFallback } from "./lib/fts-query";
import { searchTourIds, type D1Like } from "./fts-search";

export async function rankedTourIds(language: string, text: string | undefined): Promise<string[] | null> {
  if (!text || !isSearchV2(process.env.SEARCH_V2_ENABLED)) return null;
  const q = ftsQuery(text);
  if (!q) return null;
  try {
    const ids = await cached(cacheKey("fts", { language, q, v: "1" }), POLICY.toursList, () =>
      withRetry(async () => (await searchTourIds(getD1() as unknown as D1Like, language, text)) ?? []));
    return rankedOrFallback(ids);
  } catch (error) {
    console.error("[busqueda] FTS no disponible, se usa la búsqueda por palabras:", (error as Error).message);
    return null;
  }
}
