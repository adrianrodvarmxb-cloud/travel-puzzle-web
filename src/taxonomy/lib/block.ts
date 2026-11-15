/**
 * REQ-10686 · Ficha única (frente #549), ola 3: bloque único de taxonomía (plan §2, `src/taxonomy/lib/block.ts`). Puro:
 * sin red, base, reloj ni `process.env`.
 * - Tarjeta, ficha y marcado (JSON-LD) leen el MISMO bloque: tipo + hasta 3 temas + atributos, con el nombre del
 *   diccionario en el idioma del sitio (es o en; los demás idiomas leen el inglés, como el filtro, REQ-531).
 * - Decisión 10 (REQ-10589, PO 14-11): en FREETOUR solo el tipo y dos atributos (las facetas de hoy), sin temas.
 * - Decisión 11 (REQ-10590 / REQ-10659): «Con traslado», «Día completo» para toda actividad de 6 h o más y «Cancelación
 *   gratuita» salen solo por dato real y solo con el bloque encendido (`gates.atributosDecision11`).
 * - Solo términos `activo` del diccionario; los `tras_bandera` de la decisión 11 entran con el bloque encendido.
 *   Calificación y favorito nunca son etiqueta (salen de reseñas, REQ-581).
 * REQ-10687: bandera `TAXONOMY_BLOCK_ENABLED` (wrangler.jsonc, "false"); apagada, nada cambia (fichaFacets, tourLabels y
 * categoryLabel siguen como hoy). Requiere TAXONOMY_PUBLISH_ENABLED, como las demás banderas de T5.
 */
import type { Dictionary, Mapping } from "../schemas/dictionary";
import { DEFAULT_DICTIONARY, DEFAULT_MAPPINGS } from "../data";
import { classify } from "./classify";
import { ATRIBUTOS_FACETA, FORMATOS_FILTRO, formatoCardLabel, type FormatoFiltro } from "./filters";
import { DEFAULT_GATES, type Gates } from "./gates";
import { MAX_TEMAS, type ClassifyInput, type ClassifyResult } from "./types";

export interface BlockTerm { slug: string; label: string }
export interface TaxonomyBlock { tipo: BlockTerm | null; temas: BlockTerm[]; atributos: BlockTerm[] }
export interface BlockOptions {
  /** Id del mapeo (`freetour`, `tangol`, `propios`, …). */
  proveedor: string;
  lang: string;
  dict?: Dictionary;
  /** Decisión 11 encendida (= bloque encendido). Apagada, los términos `tras_bandera` no salen. */
  decision11?: boolean;
}

export const EMPTY_BLOCK: TaxonomyBlock = { tipo: null, temas: [], atributos: [] };
/** REQ-581: salen de reseñas, no describen el producto. */
const NOT_A_TAG: ReadonlySet<string> = new Set(["calificacion", "favorito"]);
/** REQ-10659: términos de la decisión 11 que viven `tras_bandera` en el diccionario hasta que el bloque se encienda. */
export const ATRIBUTOS_DECISION_11 = ["con-traslado", "dia-completo", "cancelacion-gratis"] as const;
const FREETOUR = "freetour";

type Term = { slug: string; eje: string; estado: string; termino_es?: string; termino_en?: string; valores?: { slug: string; termino_es?: string; termino_en?: string }[] };
const termName = (t: { termino_es?: string; termino_en?: string }, lang: string): string => (lang === "es" ? t.termino_es : t.termino_en) ?? t.termino_es ?? "";

/** REQ-10687: solo "true" exacto la enciende, y solo con la publicación de la taxonomía (T3) encendida. */
export function taxonomyBlockEnabled(env: { TAXONOMY_BLOCK_ENABLED?: string; TAXONOMY_PUBLISH_ENABLED?: string }): boolean {
  return env.TAXONOMY_BLOCK_ENABLED === "true" && env.TAXONOMY_PUBLISH_ENABLED === "true";
}

/** REQ-10687: el bloque encendido prende la decisión 11 y nada más de los gates. */
export function blockGates(enabled: boolean, base: Gates = DEFAULT_GATES): Gates {
  return { ...base, atributosDecision11: enabled };
}

/** Un término del diccionario puede verse: `activo` siempre; los de la decisión 11 también `tras_bandera` con el bloque encendido. */
function visible(t: Term | undefined, decision11: boolean): t is Term {
  if (!t) return false;
  if (t.estado === "activo") return true;
  return decision11 && t.estado === "tras_bandera" && (ATRIBUTOS_DECISION_11 as readonly string[]).includes(t.slug);
}

// REQ-10686
export function taxonomyBlock(clase: Pick<ClassifyResult, "formato" | "temas" | "atributos">, o: BlockOptions): TaxonomyBlock {
  if (clase.formato === "fuera" || clase.formato === "por-revisar") return EMPTY_BLOCK;
  const dict = o.dict ?? DEFAULT_DICTIONARY;
  const terms = dict.terminos as unknown as Term[];
  const find = (eje: string, slug: string) => terms.find((t) => t.eje === eje && t.slug === slug);
  const decision11 = o.decision11 === true;
  const esFreetour = o.proveedor === FREETOUR;

  // Tipo: la etiqueta corta de la tarjeta (REQ-531, REQ-822), la misma del filtro y de los chips (REQ-1250).
  let tipo: BlockTerm | null = null;
  if ((FORMATOS_FILTRO as readonly string[]).includes(clase.formato)) tipo = { slug: clase.formato, label: formatoCardLabel(clase.formato as FormatoFiltro, o.lang) };
  else { const f = find("formato", clase.formato); if (visible(f, false)) tipo = { slug: clase.formato, label: termName(f, o.lang) }; }

  // Temas: hasta 3, en el orden del clasificador; ninguno en FREETOUR (decisión 10).
  const temas: BlockTerm[] = [];
  if (!esFreetour) {
    for (const slug of clase.temas) {
      if (temas.length >= MAX_TEMAS) break;
      const t = find("tema", slug);
      if (visible(t, false)) temas.push({ slug, label: termName(t, o.lang) });
    }
  }

  // Atributos: en FREETOUR solo las facetas de hoy (decisión 10); en los demás, los visibles del diccionario.
  const atributos: BlockTerm[] = [];
  const vistos = new Set<string>();
  for (const a of clase.atributos) {
    const [slug, valor] = a.split(":");
    if (NOT_A_TAG.has(slug)) continue;
    if (esFreetour && !(ATRIBUTOS_FACETA as readonly string[]).includes(slug)) continue;
    const t = find("atributo", slug);
    if (!visible(t, decision11)) continue;
    const v = valor ? t.valores?.find((x) => x.slug === valor) : undefined;
    const label = v ? termName(v, o.lang) : termName(t, o.lang);
    if (!label || vistos.has(label)) continue;
    vistos.add(label);
    atributos.push({ slug: a, label });
  }
  return { tipo, temas, atributos };
}

/** REQ-10686: el bloque de un producto desde el clasificador oficial (la ficha clasifica en vivo, como fichaFacets). */
export function classifyBlock(
  input: ClassifyInput, o: Omit<BlockOptions, "proveedor"> & { mappings?: Record<string, Mapping>; gates?: Gates },
): TaxonomyBlock {
  const dict = o.dict ?? DEFAULT_DICTIONARY;
  const mappings = o.mappings ?? DEFAULT_MAPPINGS;
  if (!mappings[input.proveedor]) return EMPTY_BLOCK;
  const gates = o.gates ?? blockGates(o.decision11 === true);
  const r = classify(input, dict, mappings, gates);
  return taxonomyBlock(r, { proveedor: input.proveedor, lang: o.lang, dict, decision11: o.decision11 });
}

// Lectores: una lectura por superficie, todas del mismo bloque (decisión 3: un lector por superficie).
/** Tarjeta: la etiqueta de la foto (hoy `categoryLabel`). */
export function blockCardLabel(b: TaxonomyBlock): string | null {
  return b.tipo?.label ?? null;
}
/** Ficha: los chips fuera de la foto (hoy `tourLabels`): tipo, temas y atributos, en ese orden. */
export function blockLabels(b: TaxonomyBlock): string[] {
  return [...(b.tipo ? [b.tipo.label] : []), ...b.temas.map((t) => t.label), ...b.atributos.map((a) => a.label)];
}
/** Marcado (JSON-LD, hoy `fichaFacets`): tipo principal y etiquetas (temas y atributos), sin repetidos. */
export function blockFacets(b: TaxonomyBlock): { tipo: string | null; etiquetas: string[] } {
  return { tipo: blockCardLabel(b), etiquetas: [...new Set([...b.temas, ...b.atributos].map((t) => t.label).filter(Boolean))] };
}
