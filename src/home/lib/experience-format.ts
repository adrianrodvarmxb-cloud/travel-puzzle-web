/**
 * REQ-451 — TEMPORAL: regla mínima del Eje A «Formato» para los carruseles del home (puro).
 * Alineada con la taxonomía homologada del 6 nov 2026 (taxonomia.md §4.1 y taxonomia-diccionario.csv:
 * precedencia de arriba abajo, gana la primera regla que se cumple).
 * REEMPLAZAR por el clasificador de la taxonomía (TaxonomyTerm `formato:*`, plan de taxonomía §13) cuando llegue
 * al repo; los carruseles solo deben cambiar el import.
 */

export type ExperienceFormat =
  | "fuera" | "traslado" | "transporte" | "alquiler" | "entradas" | "autoguiado" | "pieza-libre"
  | "circuito" | "excursion-dia" | "caminata" | "experiencia-unica" | "tour" | "a-la-medida" | "por-revisar";

/** Las 29 categorías vigentes de FREETOUR (archivo del PO, 4 nov 2026). Un id nuevo o histórico es «por-revisar». */
const KNOWN = new Set([3, 4, 5, 7, 8, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]);
const EXPERIENCE = new Set([7, 16, 18, 21, 23, 27, 32, 33, 34]);
const TICKETS = new Set([20, 24, 28, 35]);

const has = (titles: readonly string[], re: RegExp) => titles.some((t) => re.test(t.normalize("NFD").replace(/[̀-ͯ]/g, "")));
const TRANSFER = /\b(transfer|traslado|shuttle)/i;
const TOUR_WORD = /\btour\b/i;
const HOP_ON = /hop[\s-]?on/i;
const TICKET = /\b(entrada|ticket|skip[\s-]the[\s-]line|pass)\b/i;
/** «N días / N days» con N ≥ 2, overnight, multi-day. */
const MULTI_DAY = /\b([2-9]|\d{2,})\s*(dias|days)\b|overnight|multi[\s-]?day|varios dias/i;
/** Palabras de excursión del diccionario: excursión, day trip, full day, desde, from. */
const DAY_TRIP = /excursion|day[\s-]?trip|full[\s-]?day|\bdesde\b|\bfrom\b/i;
const CLASS = /\b(clase|taller|cooking)/i;

export interface FreetourInput { categoryId: number; price: number; durationMinutes: number | null; titles: readonly string[] }

// REQ-451
export function freetourFormat(t: FreetourInput, opts: { freeWins?: boolean } = {}): ExperienceFormat {
  const freeWins = opts.freeWins ?? true;
  const cat = t.categoryId;
  const dur = t.durationMinutes ?? 0;
  const generic = cat === 13 || cat === 14;
  if (cat === 8 || cat === 31) return "fuera";
  if (!KNOWN.has(cat)) return "por-revisar";
  if (cat === 29 || (generic && has(t.titles, TRANSFER) && !has(t.titles, TOUR_WORD))) return "traslado";
  if (cat === 30 || has(t.titles, HOP_ON)) return "transporte";
  if (cat === 26) return "alquiler";
  if (TICKETS.has(cat) || (generic && has(t.titles, TICKET))) return "entradas";
  if (cat === 17) return "autoguiado";
  if (freeWins && t.price === 0) return "pieza-libre";
  if (dur >= 1440 || has(t.titles, MULTI_DAY)) return "circuito";
  if (cat === 4 || (dur >= 360 && has(t.titles, DAY_TRIP))) return "excursion-dia";
  if (cat === 12 || cat === 10) return "caminata";
  if (EXPERIENCE.has(cat) || (cat === 5 && has(t.titles, CLASS))) return "experiencia-unica";
  return "tour";
}

/**
 * REQ-451: ¿es excursión de un día para el carrusel? Misma regla, pero sin que «precio 0» gane:
 * una excursión gratis (cat 4 a propina) sigue siendo una excursión de un día.
 */
export const DAY_TRIP_MIN_MINUTES = 360;
/**
 * Gate C11 (por firmar): en el carrusel se exige además ≥ 6 h cuando se conoce la duración. En producción, FREETOUR marca
 * como cat 4 recorridos a pie de 1:30 a 2:30 h, que no son «salir de la ciudad y volver el mismo día» (el copy no lo promete).
 */
export const isDayTripTour = (t: FreetourInput): boolean =>
  freetourFormat(t, { freeWins: false }) === "excursion-dia" && (t.durationMinutes === null || t.durationMinutes >= DAY_TRIP_MIN_MINUTES);

export interface TripInput { kind: string; durationDays: number | null; titles: readonly string[] }

// REQ-451: viajes propios y de agencias (kind del gestor).
export function tripFormat(t: TripInput): ExperienceFormat {
  if (t.kind === "transporte") return "transporte";
  if (t.kind === "circuito") return "circuito";
  if (t.kind === "personalizado") return "a-la-medida";
  if (t.kind === "unica") return "experiencia-unica";
  if (t.kind === "tour") return (t.durationDays === null || t.durationDays === 1) && has(t.titles, DAY_TRIP) ? "excursion-dia" : "tour";
  return "por-revisar";
}

export const isDayTripTrip = (t: TripInput): boolean => tripFormat(t) === "excursion-dia";

/** REQ-10515: también los formatos de la taxonomía (`FormatoOEstado`) que no son «cosas que hacer» en el lugar. */
const NOT_RANKED = new Set<string>(["fuera", "traslado", "transporte", "alquiler", "por-revisar", "en-linea", "esenciales-viaje"]);
/** REQ-450: formatos que entran a los carruseles por reseñas (fuera online/servicios, traslados, transporte y alquiler). */
// REQ-10515: acepta el formato de la regla temporal o el de la taxonomía (string).
export const isOnSiteForRanking = (f: ExperienceFormat | string): boolean => !NOT_RANKED.has(f);
