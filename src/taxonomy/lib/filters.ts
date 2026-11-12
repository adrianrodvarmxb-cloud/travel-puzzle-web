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
  "pieza-libre", "caminata", "visita-guiada", "tour", "excursion-dia", "experiencia-unica", "entradas", "autoguiado", "circuito", "a-la-medida", "en-linea", // REQ-1262
] as const satisfies readonly FormatoOEstado[];
export type FormatoFiltro = (typeof FORMATOS_FILTRO)[number];

/** Etiquetas visibles (es y en del diccionario; pt/de/fr/it del flujo de traducción en T5, mientras tanto en inglés). */
export const FORMATO_LABEL: Record<FormatoFiltro, { es: string; en: string }> = {
  "pieza-libre": { es: "Pieza libre", en: "Free Puzzle" }, // REQ-269 (PO 6-11 10:43); EN REQ-1103 (PO 7-11 06:06)
  // REQ-1250 (decisión B del PO, 7-11 08:01): tres tipos con el mismo nombre en tarjeta, filtro y chips; ninguno dice «tour» si no es Tour (D17).
  caminata: { es: "Caminata", en: "Walking tour" },
  "visita-guiada": { es: "Visita guiada", en: "Guided visit" },
  tour: { es: "Tour", en: "Tour" },
  "excursion-dia": { es: "Excursión de un día", en: "Day trip" },
  "experiencia-unica": { es: "Momentos de autor", en: "Signature moments" },
  entradas: { es: "Boletos y entradas", en: "Tickets & passes" },
  autoguiado: { es: "Autoguiado (audioguía)", en: "Self-guided / audio guide" },
  circuito: { es: "Circuito (varios días)", en: "Multi-day tour" },
  "a-la-medida": { es: "Viaje a la medida", en: "Tailor-made trip" },
  "en-linea": { es: "Experiencias en línea", en: "Online experiences" }, // REQ-1262
};
export const formatoLabel = (f: FormatoFiltro, lang: string) => FORMATO_LABEL[f][lang === "es" ? "es" : "en"];

/**
 * REQ-531 (opción A, firmada por el PO 6-11 20:30): nombres cortos SOLO para la etiqueta sobre la foto de la tarjeta.
 * El filtro «Tipo de experiencia», los chips de la ciudad y la ficha siguen con FORMATO_LABEL (nombres largos).
 * Misma lista de formatos (el tipo obliga a tener uno por cada FORMATOS_FILTRO); sin paréntesis.
 */
export const FORMATO_CARD_LABEL: Record<FormatoFiltro, { es: string; en: string }> = {
  "pieza-libre": { es: "Pieza libre", en: "Free Puzzle" }, // REQ-1103
  caminata: { es: "Caminata", en: "Walking tour" },
  "visita-guiada": { es: "Visita guiada", en: "Guided visit" }, // REQ-1250
  tour: { es: "Tour", en: "Tour" }, // REQ-1250 reemplaza «Tour → Visita guiada» de REQ-531/D15
  "excursion-dia": { es: "Excursión de un día", en: "Day trip" },
  "experiencia-unica": { es: "Momentos de autor", en: "Signature moments" },
  entradas: { es: "Boletos", en: "Tickets" },
  autoguiado: { es: "Autoguiado", en: "Self-guided" },
  circuito: { es: "Circuito", en: "Multi-day tour" },
  "a-la-medida": { es: "Viaje a la medida", en: "Tailor-made" },
  "en-linea": { es: "En línea", en: "Online" }, // REQ-1262
};
/**
 * REQ-543 (PO 6-11 21:14): atributos que complementan el tipo principal y quedan listos como facetas del filtro
 * «Tipo de experiencia» (es/en del diccionario; un test los compara). Todavía no se pintan en /tours.
 */
export const ATRIBUTOS_FACETA = ["entrada-incluida", "dia-completo"] as const;
export type AtributoFaceta = (typeof ATRIBUTOS_FACETA)[number];
export const ATRIBUTO_FACETA_LABEL: Record<AtributoFaceta, { es: string; en: string }> = {
  "entrada-incluida": { es: "Entrada incluida", en: "Admission included" },
  "dia-completo": { es: "Día completo", en: "Full day" },
};
// REQ-543
export const atributoFacetaLabel = (a: AtributoFaceta, lang: string) => ATRIBUTO_FACETA_LABEL[a][lang === "es" ? "es" : "en"];

// REQ-531
export const formatoCardLabel = (f: FormatoFiltro, lang: string) => FORMATO_CARD_LABEL[f][lang === "es" ? "es" : "en"];

/** Enlaces viejos ?tipo_act= (REQ-051) → formato equivalente; los grupos que son tema o transporte se ignoran. */
export const TIPO_ACT_A_FORMATO: Record<string, FormatoFiltro[]> = {
  visitas: ["pieza-libre", "caminata", "visita-guiada", "tour", "autoguiado"],
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
// REQ-1256: con `defs` (del diccionario, armadas en el servidor) los tipos y sus nombres largos salen de ahí.
export function formatoOptions(counts: Partial<Record<string, number>> | null | undefined, selected: readonly string[], lang: string, defs?: readonly { slug: string; largo: { es: string; en: string } }[]) {
  const list = defs ?? FORMATOS_FILTRO.map((f) => ({ slug: f as string, largo: FORMATO_LABEL[f] }));
  return list.filter((d) => (counts?.[d.slug] ?? 0) > 0 || selected.includes(d.slug))
    .map((d) => ({ slug: d.slug, label: lang === "es" ? d.largo.es : d.largo.en, count: counts?.[d.slug] ?? 0 }));
}

/**
 * REQ-1421 (firma del PO 8-11: «Firmo, publícalos»): temas del filtro de /tours. Los 12 con chip; «Ciudad y barrios»
 * es base, no filtro (REQ-411). Etiquetas del diccionario (un test las compara). Reemplaza el bloqueo de REQ-410.
 */
export const TEMAS_FILTRO = [
  "gastronomia", "naturaleza", "montana-senderismo", "aventura", "playa-mar", "cultural", "religioso",
  "noche-espectaculos", "bienestar", "talleres-aprendizaje", "deportivo", "parques-ocio",
] as const;
export type TemaFiltro = (typeof TEMAS_FILTRO)[number];
export const TEMA_LABEL: Record<TemaFiltro, { es: string; en: string }> = {
  gastronomia: { es: "Gastronomía", en: "Food & drink" },
  naturaleza: { es: "Naturaleza", en: "Nature" },
  "montana-senderismo": { es: "Montaña y senderismo", en: "Mountains & hiking" },
  aventura: { es: "Aventura", en: "Adventure" },
  "playa-mar": { es: "Playa y mar", en: "Beach & sea" },
  cultural: { es: "Cultural e historia", en: "Culture & history" },
  religioso: { es: "Religioso y espiritual", en: "Religious & spiritual" },
  "noche-espectaculos": { es: "Noche y espectáculos", en: "Nightlife & shows" },
  bienestar: { es: "Bienestar", en: "Wellness" },
  "talleres-aprendizaje": { es: "Talleres y aprendizaje", en: "Classes & workshops" },
  deportivo: { es: "Deportes", en: "Sports" },
  "parques-ocio": { es: "Parques y ocio", en: "Theme parks & leisure" },
};

/**
 * REQ-1422 (firma del PO 8-11): atributos del filtro: Cómo te mueves (a pie, bici, vehículo, barco), Nocturno,
 * Entrada incluida, Día completo, En español y Con vuelo. En la URL van sin el prefijo «medio:» (?atrib=a-pie).
 */
export const MEDIOS_FILTRO = ["a-pie", "bici", "vehiculo", "barco"] as const;
export const EXTRAS_FILTRO = ["nocturno", "entrada-incluida", "dia-completo", "idioma-es", "vuelo-incluido"] as const;
export const ATRIBUTOS_FILTRO = [...MEDIOS_FILTRO, ...EXTRAS_FILTRO] as const;
export type AtributoFiltro = (typeof ATRIBUTOS_FILTRO)[number];
export const ATRIBUTO_LABEL: Record<AtributoFiltro, { es: string; en: string }> = {
  "a-pie": { es: "A pie", en: "On foot" },
  bici: { es: "En bici", en: "By bike" },
  vehiculo: { es: "En vehículo", en: "By vehicle" },
  barco: { es: "En barco", en: "By boat" },
  nocturno: { es: "Nocturno", en: "At night" },
  "entrada-incluida": { es: "Entrada incluida", en: "Admission included" },
  "dia-completo": { es: "Día completo", en: "Full day" },
  "idioma-es": { es: "En español", en: "In Spanish" },
  "vuelo-incluido": { es: "Con vuelo", en: "Flight included" },
};

const pick = <S extends string>(list: readonly S[], raw: string | null): S[] => {
  const want = new Set((raw ?? "").split(",").map((s) => s.trim()));
  return list.filter((s) => want.has(s));
};
// REQ-1421
export const parseTemas = (q: URLSearchParams): TemaFiltro[] => pick(TEMAS_FILTRO, q.get("tema"));
// REQ-1422
export const parseAtributos = (q: URLSearchParams): AtributoFiltro[] => pick(ATRIBUTOS_FILTRO, q.get("atrib"));

/** REQ-1422: atributos del clasificador («medio:barco», «nocturno»…) → los del filtro; el resto no se filtra. */
export function atributosDeClase(atributos: readonly string[] | undefined): AtributoFiltro[] {
  const set = new Set((atributos ?? []).map((a) => (a.startsWith("medio:") ? a.slice(6) : a)));
  return ATRIBUTOS_FILTRO.filter((a) => set.has(a));
}

/** REQ-1421, REQ-1422 (como REQ-412): solo opciones con resultados, más las ya marcadas; en el orden de la lista. */
export interface FacetOption { slug: string; label: string; count: number }
export function facetOptions(list: readonly string[], labels: Readonly<Record<string, { es: string; en: string }>>, counts: Readonly<Record<string, number>> | null | undefined, selected: readonly string[], lang: string): FacetOption[] {
  const out: FacetOption[] = [];
  for (const s of list) {
    const count = counts?.[s] ?? 0;
    const l = labels[s];
    if (l && (count > 0 || selected.includes(s))) out.push({ slug: s, label: lang === "es" ? l.es : l.en, count });
  }
  return out;
}
