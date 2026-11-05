/**
 * Modelo de la página /arma-tu-viaje (REQ-105, REQ-106, REQ-108). Puro: recibe la Primera Pieza,
 * los parámetros, el asesor y las sondas de los adaptadores, y devuelve lo que se pinta.
 * Fechas sin Intl (render determinista, INC-001).
 */
import type { CartItemType, People } from "./item";
import { chooseAction, shortDate, type AdapterProbe, type Advisor } from "./switch";
import { buildCarousel, DEFAULT_RULES, type CarouselCard, type CarouselFlags, type CompanionCategory } from "@/companions/lib/carousel";

export interface TripPiece { title: string; date: string; cityName: string; people: People }
export interface TripQuery { country: string | null; cityCode: string | null; travelerCountry: string | null }

const ISO2 = /^[A-Za-z]{2}$/;
const CITY_CODE = /^[a-z0-9-]{2,80}$/;

/** Lee y limpia los parámetros de la URL; lo inválido se descarta. */
export function parseTripQuery(sp: Record<string, string | string[] | undefined>): TripQuery {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const iso = (v: string) => (ISO2.test(v) ? v.toUpperCase() : null);
  const cc = one("cc").toLowerCase();
  return { country: iso(one("pais")), cityCode: CITY_CODE.test(cc) ? cc : null, travelerCountry: iso(one("viajero")) };
}

/** Qué ofrece cada categoría, en palabras del cliente. */
export const CATEGORY_TITLES: Record<CompanionCategory, string> = {
  tour: "Un tour para completar el día", day_trip: "Una excursión de un día", transfer: "Traslado del aeropuerto a tu hotel",
  esim: "eSIM con datos para tu viaje", tickets: "Entradas a atracciones", insurance: "Seguro de viaje",
  transport: "Transporte entre ciudades", car_rental: "Renta de auto", lodging: "Alojamiento",
  visa: "Asesoría de visa", etias: "Trámite ETIAS",
};
const CANDIDATE_TYPES: { type: CartItemType; category: CompanionCategory }[] = (
  ["tour", "day_trip", "transfer", "esim", "tickets", "insurance", "transport", "car_rental", "lodging", "visa"] as const
).map((t) => ({ type: t, category: t as CompanionCategory })).concat([{ type: "visa", category: "etias" }]);

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export interface ArmaTuViajeModel {
  piece: { title: string; when: string; cityName: string; status: "Confirmada"; cost: "Costo 0" } | null;
  /** Tarjetas de escritorio (4); en móvil se pintan solo las 3 primeras. */
  cards: CarouselCard[];
  cityCode: string | null;
}

export function buildArmaTuViajeModel(input: {
  piece: TripPiece | null;
  query: TripQuery;
  advisor: Advisor;
  probes: Partial<Record<CompanionCategory, AdapterProbe[]>>;
  flags: CarouselFlags;
  now: number;
}): ArmaTuViajeModel {
  const { piece, query } = input;
  if (!piece) return { piece: null, cards: [], cityCode: null };
  const cityCode = query.cityCode ?? (slug(piece.cityName) || null);
  const day = piece.date.slice(0, 10);
  const quoteCtx = { cityName: piece.cityName, dateFrom: day, people: piece.people };

  const candidates = CANDIDATE_TYPES.map(({ type, category }) => {
    const probes = input.probes[category] ?? [];
    const action = chooseAction(category, probes, input.advisor, quoteCtx);
    const chosen = action && action.kind !== "whatsapp" ? probes.find((p) => p.adapterId === action.adapterId) : undefined;
    return { type, category, title: CATEGORY_TITLES[category], chargedBy: chosen?.chargedBy ?? "Travel Puzzle", action };
  });

  const cards = buildCarousel({
    candidates,
    context: { country: query.country ?? "", cityCode: cityCode ?? "", travelerCountry: query.travelerCountry ?? undefined, freeTourAt: piece.date, now: input.now },
    device: "desktop",
    rules: DEFAULT_RULES,
    flags: input.flags,
  });

  return {
    piece: { title: piece.title, when: shortDate(piece.date), cityName: piece.cityName, status: "Confirmada", cost: "Costo 0" },
    cards,
    cityCode,
  };
}
