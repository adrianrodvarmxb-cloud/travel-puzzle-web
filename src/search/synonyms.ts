/**
 * REQ-361/362: mapa de sinónimos del buscador (raíz del dominio). data/search-synonyms.json + diccionario de
 * taxonomía. Mientras T1 (PR #156, src/taxonomy) no esté en main, la lista de la taxonomía va vacía; al fusionarse
 * se pasa `DEFAULT_DICTIONARY.terminos` en TAXONOMY_TERMS (la forma ya coincide con TaxonomyTerm).
 */
import raw from "../../data/search-synonyms.json";
import { buildSynonyms, type SynonymMap, type TaxonomyTerm } from "./lib/synonyms";
import { taxonomySearchInput, taxonomySynonymsEnabled } from "./lib/taxonomy-terms";
import { DEFAULT_DICTIONARY } from "@/taxonomy/data";

/** Sin uso desde REQ-1357 (la taxonomía entra por taxonomySearchInput, tras su bandera); se conserva vacío. */
export const TAXONOMY_TERMS: readonly TaxonomyTerm[] = [];

let map: SynonymMap | null = null;
let mapFor: boolean | null = null;
export function searchSynonyms(): SynonymMap {
  // REQ-1357: con SEARCH_TAXONOMY_SYNONYMS_ENABLED, los sinónimos y el legado del diccionario; apagada, como antes.
  const on = taxonomySynonymsEnabled(process.env as Record<string, string | undefined>);
  if (!map || mapFor !== on) {
    const tax = taxonomySearchInput(DEFAULT_DICTIONARY, on);
    mapFor = on;
    const built = buildSynonyms(raw, tax.terms, tax.legacy);
    if (built.rejected) console.error(`[busqueda] ${built.rejected} grupo(s) de sinónimos inválido(s) descartado(s)`);
    map = built.map;
  }
  return map;
}
