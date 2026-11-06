/**
 * REQ-285: buscador tolerante a erratas tras SEARCH_FUZZY_ENABLED (apagado por defecto; requiere SEARCH_V2_ENABLED).
 * Raíz del dominio: une el índice curado generado en el build con el diccionario del catálogo, que se arma una vez
 * por catálogo cargado (el catálogo se renueva cada 30 min, REQ-035). Cualquier falla deja el texto tal cual.
 */
import generated from "./data/search-index.generated.json";
import { curatedFromArtifact, type CuratedArtifact, type CuratedAliases } from "./lib/aliases";
import { buildFuzzyDict, resolveFuzzy, type FuzzyDict, type FuzzyResult, type FuzzySource } from "./lib/fuzzy";

/** Interruptor SEARCH_FUZZY_ENABLED (apagado por defecto). */
export const isSearchFuzzy = (v: string | undefined) => v === "true";

let curated: CuratedAliases | null = null;
const curatedAliases = () => (curated ??= curatedFromArtifact(generated as unknown as CuratedArtifact));

const byArray = new WeakMap<object, FuzzyDict>();
let last: { sig: string; dict: FuzzyDict } | null = null;
/** Firma barata del catálogo: si la caché devuelve una copia nueva del mismo catálogo, no se rehace el índice. */
const signature = (e: FuzzySource[]) => `${e.length}:${e.reduce((n, x) => n + (x.cityNames?.length ?? 0) + (x.countryNames?.length ?? 0), 0)}:${e[0]?.text.length ?? 0}:${e[e.length - 1]?.text.length ?? 0}`;

export function fuzzyDictFor(entries: FuzzySource[]): FuzzyDict {
  const hit = byArray.get(entries);
  if (hit) return hit;
  const sig = signature(entries);
  const dict = last && last.sig === sig ? last.dict : buildFuzzyDict(entries);
  last = { sig, dict };
  byArray.set(entries, dict);
  return dict;
}

/** Texto ya resuelto (alias + corrección). Sin bandera, o si algo falla, el texto original sin cambios. */
// REQ-285
export function fuzzySearch(entries: FuzzySource[], text: string | undefined, enabled: boolean): FuzzyResult | null {
  if (!enabled || !text || !text.trim()) return null;
  try {
    return resolveFuzzy(text, fuzzyDictFor(entries), curatedAliases());
  } catch (error) {
    console.error("[busqueda] corrección no disponible, se busca el texto tal cual:", (error as Error).message);
    return null;
  }
}
