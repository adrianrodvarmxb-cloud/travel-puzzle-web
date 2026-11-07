/**
 * REQ-051, REQ-056: filtros estilo Civitatis (idioma, fecha, tipo de actividad, cancelación gratuita, privado,
 * recogida en hotel, novedad y duración) — un solo modelo, leído y escrito en la URL. Puro.
 */
import { parseGuideLanguage, parseTripDate } from "@/departures/lib/params";
import { parseFormatos } from "@/taxonomy/lib/filters";

export interface ExtraFilters {
  guideLanguage: string | null; date: string | null; groups: string[];
  freeCancel: boolean; privateOnly: boolean; hotelPickup: boolean; novelty: boolean;
  durMin: number | null; durMax: number | null; // minutos
  /** T4 (REQ-413): ?formato= de la taxonomía; vacío con TAXONOMY_FILTERS_ENABLED apagada. */
  formatos: string[];
}
export const EMPTY_EXTRA: ExtraFilters = { guideLanguage: null, date: null, groups: [], freeCancel: false, privateOnly: false, hotelPickup: false, novelty: false, durMin: null, durMax: null, formatos: [] };

type L = Record<"es" | "en" | "pt" | "de" | "fr" | "it", string>;
/** Grupos de "Tipo de actividad" (como Civitatis) a partir de las 29 categorías de Freetour (archivo del PO, 4 nov 2026). */
export const CATEGORY_GROUPS: { id: string; ids: number[]; label: L }[] = [
  { id: "visitas", ids: [12, 10, 19, 17, 22], label: { es: "Visitas guiadas y Pieza libre", en: "Guided tours & free tours", pt: "Visitas guiadas e free tours", de: "Führungen & Free Tours", fr: "Visites guidées et free tours", it: "Visite guidate e free tour" } },
  { id: "barcos", ids: [3, 32], label: { es: "Paseos en barco y actividades acuáticas", en: "Boat trips & water activities", pt: "Passeios de barco e atividades aquáticas", de: "Bootsfahrten & Wasseraktivitäten", fr: "Balades en bateau et activités nautiques", it: "Gite in barca e attività acquatiche" } },
  { id: "entradas", ids: [20, 24, 35, 28], label: { es: "Entradas, museos y pases", en: "Tickets, museums & passes", pt: "Ingressos, museus e passes", de: "Tickets, Museen & Pässe", fr: "Billets, musées et pass", it: "Biglietti, musei e pass" } },
  { id: "excursiones", ids: [4, 25], label: { es: "Excursiones de un día y naturaleza", en: "Day trips & nature", pt: "Excursões de um dia e natureza", de: "Tagesausflüge & Natur", fr: "Excursions d'une journée et nature", it: "Escursioni di un giorno e natura" } },
  { id: "varios-dias", ids: [], label: { es: "Excursiones de varios días", en: "Multi-day trips", pt: "Excursões de vários dias", de: "Mehrtägige Touren", fr: "Excursions de plusieurs jours", it: "Escursioni di più giorni" } },
  { id: "gastronomia", ids: [5], label: { es: "Gastronomía", en: "Food & drink", pt: "Gastronomia", de: "Essen & Trinken", fr: "Gastronomie", it: "Gastronomia" } },
  { id: "espectaculos", ids: [27, 7], label: { es: "Espectáculos y vida nocturna", en: "Shows & nightlife", pt: "Espetáculos e vida noturna", de: "Shows & Nachtleben", fr: "Spectacles et vie nocturne", it: "Spettacoli e vita notturna" } },
  { id: "experiencias", ids: [16, 18, 23, 21, 33, 34], label: { es: "Aventura y experiencias únicas", en: "Adventure & unique experiences", pt: "Aventura e experiências únicas", de: "Abenteuer & besondere Erlebnisse", fr: "Aventure et expériences uniques", it: "Avventura ed esperienze uniche" } },
  { id: "transporte", ids: [29, 30, 26], label: { es: "Transporte, traslados y alquileres", en: "Transport, transfers & rentals", pt: "Transporte, traslados e aluguéis", de: "Transport, Transfers & Verleih", fr: "Transport, transferts et locations", it: "Trasporti, transfer e noleggi" } },
  { id: "otros", ids: [13, 14, 31, 8], label: { es: "Otros", en: "Other", pt: "Outros", de: "Sonstiges", fr: "Autres", it: "Altro" } },
];
const GROUP_BY_CAT = new Map(CATEGORY_GROUPS.flatMap((g) => g.ids.map((id) => [id, g.id] as const)));
const GROUP_IDS = new Set(CATEGORY_GROUPS.map((g) => g.id));

// REQ-051
export const categoryGroupOf = (categoryId: number | null | undefined): string => GROUP_BY_CAT.get(categoryId ?? -1) ?? "otros";
export const groupLabel = (id: string, lang: string): string => {
  const g = CATEGORY_GROUPS.find((x) => x.id === id);
  return g ? g.label[(lang in g.label ? lang : "en") as keyof L] : id;
};

const int = (v: string | null) => (v && /^\d{1,6}$/.test(v) ? Number(v) : null);

// REQ-056
export function parseExtraFilters(q: URLSearchParams, today: string, opts: { taxonomy?: boolean } = {}): ExtraFilters {
  let durMin = int(q.get("durmin")), durMax = int(q.get("durmax"));
  if (durMin !== null && durMax !== null && durMin > durMax) durMin = durMax = null;
  return {
    guideLanguage: parseGuideLanguage(q.get("idioma")),
    date: parseTripDate(q.get("fecha"), today),
    // T4: con la taxonomía, ?tipo_act= se traduce a ?formato= y los grupos viejos quedan ocultos (no se borran).
    groups: opts.taxonomy ? [] : [...new Set((q.get("tipo_act") ?? "").split(",").filter((g) => GROUP_IDS.has(g)))],
    formatos: opts.taxonomy ? parseFormatos(q) : [],
    freeCancel: q.get("cancelacion") === "1", privateOnly: q.get("privado") === "1",
    hotelPickup: q.get("recogida") === "1", novelty: q.get("novedad") === "1",
    durMin, durMax,
  };
}

// REQ-056
export function extraFiltersToParams(f: ExtraFilters, into = new URLSearchParams()): URLSearchParams {
  if (f.guideLanguage) into.set("idioma", f.guideLanguage);
  if (f.date) into.set("fecha", f.date);
  if (f.groups.length) into.set("tipo_act", f.groups.join(","));
  if (f.formatos?.length) into.set("formato", f.formatos.join(","));
  if (f.freeCancel) into.set("cancelacion", "1");
  if (f.privateOnly) into.set("privado", "1");
  if (f.hotelPickup) into.set("recogida", "1");
  if (f.novelty) into.set("novedad", "1");
  if (f.durMin !== null) into.set("durmin", String(f.durMin));
  if (f.durMax !== null) into.set("durmax", String(f.durMax));
  return into;
}

export function countActive(f: ExtraFilters): number {
  return (f.guideLanguage ? 1 : 0) + (f.date ? 1 : 0) + f.groups.length + (f.formatos?.length ?? 0) + [f.freeCancel, f.privateOnly, f.hotelPickup, f.novelty].filter(Boolean).length + (f.durMin !== null || f.durMax !== null ? 1 : 0);
}

/** REQ-051: grupo de los viajes propios a partir de su tipo y su categoría del gestor. */
export function ownTripGroup(kind: string, category: string | null | undefined): string {
  if (kind === "circuito") return "varios-dias";
  if (kind === "transporte") return "transporte";
  const byCat: Record<string, string> = { gastronomico: "gastronomia", aventura: "experiencias", bienestar: "experiencias", ecoturismo: "excursiones", "sol-y-playa": "excursiones", cultural: "visitas", urbano: "visitas" };
  return byCat[category ?? ""] ?? "otros";
}
