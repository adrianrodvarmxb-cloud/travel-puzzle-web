/**
 * REQ-361/362: mapa de sinónimos del buscador (raíz del dominio). data/search-synonyms.json + diccionario de
 * taxonomía. Mientras T1 (PR #156, src/taxonomy) no esté en main, la lista de la taxonomía va vacía; al fusionarse
 * se pasa `DEFAULT_DICTIONARY.terminos` en TAXONOMY_TERMS (la forma ya coincide con TaxonomyTerm).
 */
import raw from "../../data/search-synonyms.json";
import { buildSynonyms, type SynonymMap, type TaxonomyTerm } from "./lib/synonyms";

export const TAXONOMY_TERMS: readonly TaxonomyTerm[] = [];

let map: SynonymMap | null = null;
export function searchSynonyms(): SynonymMap {
  if (!map) {
    const built = buildSynonyms(raw, TAXONOMY_TERMS);
    if (built.rejected) console.error(`[busqueda] ${built.rejected} grupo(s) de sinónimos inválido(s) descartado(s)`);
    map = built.map;
  }
  return map;
}
