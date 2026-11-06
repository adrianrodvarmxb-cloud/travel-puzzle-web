/**
 * REQ-285: resolución tolerante del texto del buscador ANTES de buscar (gates firmados 5 y 6 nov 2026). Puro.
 * Orden: 1) alias curado exacto (Cuzco → Cusco); 2) destino exacto (lo resuelve splitDestination, REQ-122);
 * 3) prefijo en la última palabra (lo resuelve FTS, REQ-122: aquí no se corrige lo que se está escribiendo);
 * 4) solo si nada de eso coincide, corrección de erratas con SymSpell + Damerau, umbral por longitud y la primera
 * letra doble. Se corrige solo con un candidato único con margen sobre el segundo; si no, «¿Quisiste decir…?».
 * Palabras de menos de 4 letras nunca se corrigen solas (solo sugerencia). La fonética solo reordena.
 */
import { searchTokens, STOPWORDS, GENERIC } from "./words";
import { fold } from "./normalize";
import { typoCost } from "./damerau";
import { letterCount, thresholdByLength, MAX_TYPOS } from "./threshold";
import { buildSymspellIndex, symspellCandidates, type SymspellIndex } from "./symspell";
import { esMetaphone } from "./es-metaphone";
import { aliasTarget, type CuratedAliases } from "./aliases";

/** Lo mínimo del catálogo que hace falta (CatalogEntry lo cumple). */
export interface FuzzySource { text: string; cityNames?: string[]; countryNames?: string[]; cityId?: number; countryId?: number }

export interface FuzzyDict {
  /** nombre plegado → llave del destino tal como la reconoce splitDestination, nº de tours (popularidad) y destinos
   *  que lo usan (Venecia y Venezia son el mismo: no compiten entre sí) */
  names: Map<string, { key: string; count: number; dests: Set<string> }>;
  index: SymspellIndex;
  /** todas las palabras del catálogo (títulos, resúmenes y nombres): una palabra conocida no es errata */
  vocabulary: Set<string>;
  /** vocabulario ordenado, para saber si la última palabra es inicio de otra (se está escribiendo) */
  sortedVocabulary: string[];
}

export const MAX_GRAM = 3;
export const MAX_SUGGESTIONS = 3;

const keyOf = (n: string) => searchTokens(n).join(" ");

// REQ-285
export function buildFuzzyDict(entries: FuzzySource[]): FuzzyDict {
  const names = new Map<string, { key: string; count: number; dests: Set<string> }>();
  const vocabulary = new Set<string>();
  for (const e of entries) {
    for (const w of searchTokens(e.text)) vocabulary.add(w);
    const own: [string, string][] = [
      ...(e.cityNames ?? []).map((n): [string, string] => [keyOf(n), `c${e.cityId ?? keyOf(n)}`]),
      ...(e.countryNames ?? []).map((n): [string, string] => [keyOf(n), `p${e.countryId ?? keyOf(n)}`]),
    ];
    const once = new Set<string>();
    for (const [key, dest] of own) {
      if (!key || once.has(key)) continue;
      once.add(key);
      for (const w of key.split(" ")) vocabulary.add(w);
      const f = fold(key);
      const cur = names.get(f);
      if (cur) { cur.count++; cur.dests.add(dest); } else names.set(f, { key, count: 1, dests: new Set([dest]) });
    }
  }
  // el índice se arma la primera vez que hace falta corregir (casi todas las búsquedas son alias o exactas)
  let index: SymspellIndex | null = null;
  return {
    names, vocabulary, sortedVocabulary: [...vocabulary].sort(),
    get index() { return (index ??= buildSymspellIndex(names.keys(), MAX_TYPOS)); },
  };
}

export interface FuzzyChange { from: string; to: string; kind: "alias" | "typo" }
export interface FuzzySuggestion { from: string; options: string[] }
export interface FuzzyResult {
  /** texto que se busca (con alias y corrección aplicados); igual al original si no hubo cambios */
  text: string;
  changes: FuzzyChange[];
  /** «¿Quisiste decir…?»: nunca filtra; lo muestra S3 */
  suggestions: FuzzySuggestion[];
}

function isPrefixOfKnown(dict: FuzzyDict, w: string): boolean {
  const v = dict.sortedVocabulary;
  let lo = 0, hi = v.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (v[mid] < w) lo = mid + 1; else hi = mid; }
  return lo < v.length && v[lo] !== w && v[lo].startsWith(w);
}

const isDestinationGram = (dict: FuzzyDict, gram: string[]) => {
  if (gram.length === 1 && (gram[0].length < 3 || STOPWORDS.has(gram[0]) || GENERIC.has(gram[0]))) return false;
  return dict.names.has(fold(gram.join(" ")));
};

interface Ranked { term: string; cost: number; phon: boolean; count: number; dest: string }

function rank(dict: FuzzyDict, gram: string, maxCost: number, curated: CuratedAliases): Ranked[] {
  const q = fold(gram);
  const key = esMetaphone(q);
  const seen = new Map<string, Ranked>();
  const consider = (name: string, spelled: string) => {
    const hit = dict.names.get(name);
    if (!hit) return;
    const cost = typoCost(q, spelled);
    const prev = seen.get(name);
    if (cost <= maxCost && (!prev || cost < prev.cost)) seen.set(name, { term: name, cost, phon: esMetaphone(spelled) === key, count: hit.count, dest: [...hit.dests].sort().join(",") });
  };
  const d = Math.min(MAX_TYPOS, maxCost);
  for (const c of symspellCandidates(dict.index, q, d)) consider(c.term, c.term);
  // alias con errata («cuzko» → alias «cuzco» → Cusco), con el índice curado del build
  if (curated.index) for (const c of symspellCandidates(curated.index, q, d)) {
    const target = aliasTarget(curated, c.term, (n) => dict.names.has(n));
    if (target) consider(target, c.term);
  }
  // costo → popularidad → misma clave fonética → alfabético (determinista). Popularidad antes que fonética:
  // «Medelin» empata Medellín (1) y Medulin (1) y la fonética preferiría Medulin (ll = y); los tours dicen Medellín.
  const sorted = [...seen.values()].sort((a, b) => a.cost - b.cost || b.count - a.count || Number(b.phon) - Number(a.phon) || (a.term < b.term ? -1 : 1));
  // un destino aparece una vez (su mejor nombre): «Venesia» → Venecia y Venezia no son dos opciones
  const byDest = new Set<string>();
  return sorted.filter((c) => (byDest.has(c.dest) ? false : (byDest.add(c.dest), true)));
}

/** Gana solo con margen: un único destino, o menos erratas que el segundo. La fonética y la popularidad solo ordenan. */
const hasMargin = (r: Ranked[]) => r.length === 1 || (r.length > 1 && r[0].cost < r[1].cost);

// REQ-285
export function resolveFuzzy(text: string | undefined | null, dict: FuzzyDict, curated: CuratedAliases): FuzzyResult {
  const original = (text ?? "").trim();
  const words = searchTokens(original);
  const none: FuzzyResult = { text: original, changes: [], suggestions: [] };
  if (!words.length) return none;
  const exists = (name: string) => dict.names.has(name);
  const changes: FuzzyChange[] = [];

  // 1) alias curado exacto, el grupo más largo primero
  const out: string[] = [];
  for (let i = 0; i < words.length;) {
    let done = false;
    for (let n = Math.min(MAX_GRAM, words.length - i); n >= 1 && !done; n--) {
      const gram = words.slice(i, i + n).join(" ");
      const target = aliasTarget(curated, gram, exists);
      if (!target) continue;
      const key = dict.names.get(target)!.key;
      out.push(...key.split(" "));
      if (fold(gram) !== target) changes.push({ from: gram, to: key, kind: "alias" });
      i += n; done = true;
    }
    if (!done) out.push(words[i++]);
  }
  const rewritten = () => (changes.length ? out.join(" ") : original);

  // 2) destino exacto en el texto: no se corrige nada (splitDestination filtra)
  for (let n = Math.min(MAX_GRAM, out.length); n >= 1; n--)
    for (let i = 0; i + n <= out.length; i++) if (isDestinationGram(dict, out.slice(i, i + n))) return { text: rewritten(), changes, suggestions: [] };

  // 3) y 4) corrección: grupos con al menos una palabra desconocida, sin la última si se está escribiendo
  const suggestions: FuzzySuggestion[] = [];
  for (let n = Math.min(MAX_GRAM, out.length); n >= 1; n--) {
    for (let i = 0; i + n <= out.length; i++) {
      const gramWords = out.slice(i, i + n);
      if (gramWords.every((w) => dict.vocabulary.has(w) || STOPWORDS.has(w) || GENERIC.has(w))) continue;
      if (STOPWORDS.has(gramWords[0]) || STOPWORDS.has(gramWords[gramWords.length - 1])) continue;
      const gram = gramWords.join(" ");
      const last = i + n === out.length;
      if (last && isPrefixOfKnown(dict, gramWords[gramWords.length - 1])) continue; // prefijo: lo resuelve FTS
      const blocked = curated.noCorrect.has(fold(gram));
      const th = thresholdByLength(letterCount(gram));
      if (th > 0 && !blocked) {
        const r = rank(dict, gram, th, curated);
        const auto = r.filter((c) => !curated.noCorrect.has(c.term));
        if (auto.length && hasMargin(auto) && auto.length === r.length) {
          const key = dict.names.get(auto[0].term)!.key;
          changes.push({ from: gram, to: key, kind: "typo" });
          out.splice(i, n, ...key.split(" "));
          return { text: out.join(" "), changes, suggestions: [] };
        }
        if (r.length) { suggestions.push({ from: gram, options: r.slice(0, MAX_SUGGESTIONS).map((c) => dict.names.get(c.term)!.key) }); return { text: rewritten(), changes, suggestions }; }
      } else if (!blocked && n === 1) {
        // palabra corta («Rma»): solo sugerencia, con 1 errata y sin tocar la primera letra
        const r = rank(dict, gram, 1, curated);
        if (r.length) { suggestions.push({ from: gram, options: r.slice(0, MAX_SUGGESTIONS).map((c) => dict.names.get(c.term)!.key) }); return { text: rewritten(), changes, suggestions }; }
      }
    }
  }
  return { text: rewritten(), changes, suggestions };
}
