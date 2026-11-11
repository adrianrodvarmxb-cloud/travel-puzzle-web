/**
 * REQ-1357: lo que el diccionario de taxonomía aporta al buscador, tras SEARCH_TAXONOMY_SYNONYMS_ENABLED. Puro.
 * - `terms`: los términos (sus sinónimos son equivalentes entre sí; solo los buscables, ver SEARCHABLE).
 * - `legacy`: los términos viejos fusionados (`legado`, Taxonomía 2024) buscan su término nuevo, en un solo sentido.
 */
import type { Dictionary } from "@/taxonomy/schemas/dictionary";
import type { TaxonomyTerm } from "./synonyms";

export interface LegacySynonym { from: string[]; to: string[] }

export function taxonomySynonymsEnabled(env: { SEARCH_TAXONOMY_SYNONYMS_ENABLED?: string }): boolean {
  return env.SEARCH_TAXONOMY_SYNONYMS_ENABLED === "true";
}

/** «Hikes (caminatas)» → «Hikes»; «Escalada / Escalada en roca» → las dos. */
const names = (termino: string) => termino.split("/").map((x) => x.replace(/\([^)]*\)/g, "").trim()).filter((x) => x.length >= 2);

// REQ-1357
export function taxonomySearchInput(dict: Dictionary, enabled: boolean): { terms: TaxonomyTerm[]; legacy: LegacySynonym[] } {
  if (!enabled) return { terms: [], legacy: [] };
  const terms = dict.terminos.map((t) => ({ termino_es: t.termino_es, termino_en: t.termino_en, sinonimos: t.sinonimos ?? [], estado: t.estado })) as TaxonomyTerm[];
  const target = (slug: string) => dict.terminos.find((t) => t.slug === slug && t.eje === "tema") ?? dict.terminos.find((t) => t.slug === slug);
  const legacy = (dict.legado ?? []).flatMap((l) => {
    const to = l.sinonimo_de.flatMap((s) => { const t = target(s); return t ? [t.termino_es, ...(t.termino_en ? [t.termino_en] : [])] : []; });
    const from = names(l.termino);
    return to.length && from.length ? [{ from, to }] : [];
  });
  return { terms, legacy };
}
