/**
 * T4: filtro ?formato= de /tours, tras TAXONOMY_FILTERS_ENABLED (apagada). Puro y sin el JSON del diccionario
 * (lo importa un componente de cliente): las etiquetas están aquí y un test las compara con el diccionario.
 * - REQ-413: ?formato= con slugs TP (nunca categoryId); canonical /tours y noindex,follow con el filtro; los enlaces
 *   viejos ?tipo_act= se traducen al formato equivalente o se ignoran.
 * - REQ-412: nunca un chip en cero (las opciones salen de los conteos de la consulta).
 * - REQ-410: los temas siguen en «muestra» hasta que el PO firme la precisión: ?tema= todavía no filtra.
 * - REQ-261: traslado, transporte y renta no son formatos de /tours (viven en /traslados).
 */
import type { FormatoOEstado } from "./types";

/** Formatos que se pueden filtrar en /tours (sección Experiencias y estado activo), en orden de chips. */
export const FORMATOS_FILTRO = [
  "pieza-libre", "caminata", "tour", "excursion-dia", "experiencia-unica", "entradas", "autoguiado", "circuito", "a-la-medida",
] as const satisfies readonly FormatoOEstado[];
export type FormatoFiltro = (typeof FORMATOS_FILTRO)[number];

/** Etiquetas visibles (es y en del diccionario; pt/de/fr/it del flujo de traducción en T5, mientras tanto en inglés). */
export const FORMATO_LABEL: Record<FormatoFiltro, { es: string; en: string }> = {
  "pieza-libre": { es: "Pieza libre", en: "Free tour" }, // REQ-269 (PO 6-11 10:43); EN «Free piece» por firmar
  caminata: { es: "Caminata (tour a pie)", en: "Walking tour" },
  tour: { es: "Tour", en: "Guided tour" },
  "excursion-dia": { es: "Excursión de un día", en: "Day trip" },
  "experiencia-unica": { es: "Momentos de autor", en: "Signature moments" },
  entradas: { es: "Boletos y entradas", en: "Tickets & passes" },
  autoguiado: { es: "Autoguiado (audioguía)", en: "Self-guided / audio guide" },
  circuito: { es: "Circuito (varios días)", en: "Multi-day tour" },
  "a-la-medida": { es: "Viaje a la medida", en: "Tailor-made trip" },
};
export const formatoLabel = (f: FormatoFiltro, lang: string) => FORMATO_LABEL[f][lang === "es" ? "es" : "en"];

/** Enlaces viejos ?tipo_act= (REQ-051) → formato equivalente; los grupos que son tema o transporte se ignoran. */
export const TIPO_ACT_A_FORMATO: Record<string, FormatoFiltro[]> = {
  visitas: ["pieza-libre", "caminata", "tour", "autoguiado"],
  entradas: ["entradas"],
  excursiones: ["excursion-dia"],
  "varios-dias": ["circuito"],
  espectaculos: ["experiencia-unica"],
  experiencias: ["experiencia-unica"],
};

const isFormato = (s: string): s is FormatoFiltro => (FORMATOS_FILTRO as readonly string[]).includes(s);

/** Solo "true" exacto la enciende. */
export function taxonomyFiltersEnabled(env: { TAXONOMY_FILTERS_ENABLED?: string }): boolean {
  return env.TAXONOMY_FILTERS_ENABLED === "true";
}

/** ?formato=a,b más la traducción de ?tipo_act=; slugs inválidos fuera, sin repetir, en el orden de los chips. */
export function parseFormatos(q: URLSearchParams): FormatoFiltro[] {
  const wanted = new Set<string>((q.get("formato") ?? "").split(",").map((s) => s.trim()).filter(isFormato));
  for (const g of (q.get("tipo_act") ?? "").split(",")) for (const f of TIPO_ACT_A_FORMATO[g] ?? []) wanted.add(f);
  return FORMATOS_FILTRO.filter((f) => wanted.has(f));
}

/** REQ-413: robots y canonical de /tours; con un filtro de taxonomía, noindex,follow y canonical a /tours. */
export function toursRobots(q: URLSearchParams, enabled: boolean): { robots?: { index: false; follow: true }; canonical?: "/tours" } {
  if (!enabled || !parseFormatos(q).length) return {};
  return { robots: { index: false, follow: true }, canonical: "/tours" };
}

/** REQ-412: opciones del filtro: solo formatos con resultados en el contexto, más los que ya estén marcados. */
export function formatoOptions(counts: Partial<Record<string, number>> | null | undefined, selected: readonly string[], lang: string) {
  return FORMATOS_FILTRO.filter((f) => (counts?.[f] ?? 0) > 0 || selected.includes(f))
    .map((f) => ({ slug: f, label: formatoLabel(f, lang), count: counts?.[f] ?? 0 }));
}
