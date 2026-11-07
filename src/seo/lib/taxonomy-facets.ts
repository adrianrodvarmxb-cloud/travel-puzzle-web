/**
 * REQ-581 (PO, 6 nov 2026, 21:14): tipo principal (formato) y etiquetas (temas y atributos) de una ficha, para
 * mostrarlos como texto y ponerlos en el JSON-LD. Puro. No duplica la taxonomía: llama al clasificador oficial de
 * src/taxonomy con su diccionario y mapeos, y toma los nombres del diccionario. Solo salen los términos en estado
 * `activo` (lo que está en muestra o tras bandera espera su firma); los términos nuevos aparecen solos cuando el
 * diccionario los active. Sin calificación ni favorito: salen de reseñas y no describen el producto.
 */
import { classify } from "@/taxonomy/lib/classify";
import { DEFAULT_DICTIONARY, DEFAULT_MAPPINGS } from "@/taxonomy/data";
import { FORMATOS_FILTRO, formatoLabel, type FormatoFiltro } from "@/taxonomy/lib/filters";
import type { ClassifyInput } from "@/taxonomy/lib/types";

const NOT_A_TAG = new Set(["calificacion", "favorito"]);
type Term = { slug: string; eje: string; estado: string; termino_es: string; termino_en: string; valores?: { slug: string; termino_es?: string; termino_en?: string }[] };

const termName = (t: { termino_es?: string; termino_en?: string }, lang: string) => (lang === "es" ? t.termino_es : t.termino_en) ?? t.termino_es ?? "";

export interface FichaFacets { tipo: string | null; etiquetas: string[] }

// REQ-581
export function fichaFacets(input: ClassifyInput, lang: string, dict = DEFAULT_DICTIONARY, mappings = DEFAULT_MAPPINGS): FichaFacets {
  if (!mappings[input.proveedor]) return { tipo: null, etiquetas: [] };
  const r = classify(input, dict, mappings);
  if (r.formato === "fuera" || r.formato === "por-revisar") return { tipo: null, etiquetas: [] };
  const terms = dict.terminos as unknown as Term[];
  const find = (eje: string, slug: string) => terms.find((t) => t.eje === eje && t.slug === slug);
  const fmt = find("formato", r.formato);
  const tipo = (FORMATOS_FILTRO as readonly string[]).includes(r.formato)
    ? formatoLabel(r.formato as FormatoFiltro, lang)
    : fmt && fmt.estado === "activo" ? termName(fmt, lang) : null;
  const etiquetas: string[] = [];
  for (const slug of r.temas) { const t = find("tema", slug); if (t?.estado === "activo") etiquetas.push(termName(t, lang)); }
  for (const a of r.atributos) {
    const [slug, valor] = a.split(":");
    if (NOT_A_TAG.has(slug)) continue;
    const t = find("atributo", slug);
    if (t?.estado !== "activo") continue;
    const v = valor ? t.valores?.find((x) => x.slug === valor) : undefined;
    etiquetas.push(v ? termName(v, lang) : termName(t, lang));
  }
  return { tipo, etiquetas: [...new Set(etiquetas.filter(Boolean))] };
}
