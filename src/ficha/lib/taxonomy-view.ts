/**
 * REQ-10814 · Ficha única, ola 7, bloque 4 «Taxonomía» (plan §3): tipo + hasta 3 temas + atributos, con las
 * etiquetas ya en el idioma del modelo. FREETOUR: tipo y dos atributos, como hoy (decisión 10). Sin repetidos;
 * sin datos, lista vacía (el bloque no sale). Puro.
 */
import type { FichaTaxonomy, FichaTerm } from "./model";
import { FREETOUR_PROVIDER } from "./blocks";

export const TEMAS_MAX = 3;
export const FREETOUR_ATRIBUTOS_MAX = 2;

export interface TaxonomyChip extends FichaTerm { kind: "tipo" | "tema" | "atributo" }

// REQ-10814
export function taxonomyChips(tax: FichaTaxonomy, provider: string): TaxonomyChip[] {
  const freetour = provider === FREETOUR_PROVIDER;
  const temas = freetour ? [] : tax.temas.slice(0, TEMAS_MAX);
  const atributos = freetour ? tax.atributos.slice(0, FREETOUR_ATRIBUTOS_MAX) : tax.atributos;
  const all: TaxonomyChip[] = [
    ...(tax.tipo ? [{ ...tax.tipo, kind: "tipo" as const }] : []),
    ...temas.map((t) => ({ ...t, kind: "tema" as const })),
    ...atributos.map((t) => ({ ...t, kind: "atributo" as const })),
  ];
  const seen = new Set<string>();
  return all.filter((c) => c.label.trim() !== "" && !seen.has(c.slug) && (seen.add(c.slug), true));
}
