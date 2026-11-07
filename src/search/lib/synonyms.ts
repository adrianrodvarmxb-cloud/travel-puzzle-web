/**
 * REQ-361/362: sinónimos de vocabulario del buscador (plan S6). Puro.
 * Fuentes: data/search-synonyms.json (revisado por PR) y, cuando esté fusionado, el diccionario de taxonomía (T1,
 * src/taxonomy; aquí solo su forma, sin importarlo). Un sinónimo nunca lleva la marca del proveedor (REQ-171).
 * Se expanden con OR de FTS5; los de un sentido solo amplían desde el término «desde».
 */
import { z } from "zod";
import { fold } from "./normalize";

/** Marca que nunca puede ser sinónimo (taxonomía C3, REQ-171): «freetour», «freetours», «freetour.com». */
export const BRAND = /free\s*tours?\s*(?:\.|punto)?\s*com|\bfreetours?\b/i;

const Equivalent = z.object({ mode: z.literal("equivalente"), terms: z.array(z.string().min(2)).min(2) });
const OneWay = z.object({ mode: z.literal("un-sentido"), from: z.array(z.string().min(2)).min(1), to: z.array(z.string().min(2)).min(1) });
const SynonymFile = z.object({ version: z.literal(1), comment: z.string().optional(), groups: z.array(z.unknown()) });

/** Término de la taxonomía T1 (forma estructural de src/taxonomy/data/dictionary.json → terminos[]). */
export interface TaxonomyTerm { termino_es: string; termino_en?: string; sinonimos: string[]; estado: string }
/** Estados de T1 que se pueden buscar (oculto, tras_bandera y descartado no). */
const SEARCHABLE = new Set(["activo", "muestra"]);

/** frase plegada → frases plegadas que también se buscan (incluida ella misma) */
export type SynonymMap = Map<string, string[]>;

const add = (m: Map<string, Set<string>>, from: string, to: string[]) => {
  const k = fold(from);
  if (!k || BRAND.test(k)) return;
  const set = m.get(k) ?? new Set([k]);
  for (const t of to.map(fold)) if (t && !BRAND.test(t)) set.add(t);
  m.set(k, set);
};

// REQ-361 REQ-362
export function buildSynonyms(raw: unknown, taxonomy: readonly TaxonomyTerm[] = []): { map: SynonymMap; rejected: number } {
  const m = new Map<string, Set<string>>();
  let rejected = 0;
  const file = SynonymFile.safeParse(raw);
  for (const g of file.success ? file.data.groups : []) {
    const eq = Equivalent.safeParse(g), ow = OneWay.safeParse(g);
    if (eq.success) for (const t of eq.data.terms) add(m, t, eq.data.terms);
    else if (ow.success) for (const t of ow.data.from) add(m, t, ow.data.to);
    else rejected++;
  }
  if (!file.success) rejected++;
  // REQ-362: los sinónimos de cada término de la taxonomía son equivalentes entre sí y con el término en español
  for (const t of taxonomy) {
    if (!SEARCHABLE.has(t.estado)) continue;
    const terms = [t.termino_es, ...t.sinonimos].filter((x) => x && !/[()]/.test(x));
    if (terms.length < 2) continue;
    for (const x of terms) add(m, x, terms);
  }
  return { map: new Map([...m].map(([k, v]) => [k, [...v]])), rejected };
}

export const MAX_SYNONYM_WORDS = 4;

export type QueryPart = { kind: "word"; word: string } | { kind: "phrase"; phrases: string[] };

/** Palabras → partes de la consulta: los grupos de sinónimos (el más largo primero) se vuelven una sola parte. */
// REQ-361
export function expandSynonyms(words: readonly string[], map: SynonymMap): QueryPart[] {
  const out: QueryPart[] = [];
  for (let i = 0; i < words.length;) {
    let hit: string[] | undefined, n = 0;
    for (let k = Math.min(MAX_SYNONYM_WORDS, words.length - i); k >= 1 && !hit; k--) {
      const alts = map.get(fold(words.slice(i, i + k).join(" ")));
      if (alts && alts.length > 1) { hit = alts; n = k; }
    }
    if (hit) { out.push({ kind: "phrase", phrases: hit }); i += n; }
    else out.push({ kind: "word", word: words[i++] });
  }
  return out;
}
