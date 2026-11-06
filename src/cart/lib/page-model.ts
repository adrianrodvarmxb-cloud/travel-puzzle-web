/**
 * Modelo de la página /arma-tu-viaje (REQ-105, REQ-106, REQ-108). Puro: recibe la Primera Pieza,
 * los parámetros, el asesor y las sondas de los adaptadores, y devuelve lo que se pinta.
 * Fechas sin Intl (render determinista, INC-001).
 */
import type { CartItemType, People } from "./item";
import { chooseAction, shortDate, type AdapterProbe, type Advisor } from "./switch";
import { buildCarousel, DEFAULT_RULES, ESIM_ADVISOR_COUNTRIES, type CarouselCard, type CarouselFlags, type CompanionCategory } from "@/companions/lib/carousel";
import type { NearbyExperience } from "@/companions/lib/nearby";
import { pieceCost, pieceDay, pieceWhen } from "./piece";
import { tourPriceLabel } from "@/tours/lib/price-label";
import type { FxRates } from "@/trips/lib/money";

export interface TripPiece {
  title: string;
  /** Inicio en UTC (o la fecha disponible): para la regla de <72 h. */
  date: string;
  cityName: string;
  people: People;
  /** REQ-180: `date` de FREETOUR, en la zona horaria de la ciudad del tour. */
  localDate?: string | null;
  /** REQ-181: ISO-2 del destino, de la reserva (tour → país del catálogo). */
  country?: string | null;
  /** REQ-181: slug de la ciudad del catálogo. */
  cityCode?: string | null;
  /** REQ-181: país del viajero (prefijo del teléfono de la reserva); null si no se sabe. */
  travelerCountry?: string | null;
  /** REQ-183: precio del grupo en EUR guardado en la reserva (0 = sin tarifa fija). */
  price?: number | null;
}
export interface TripQuery { country: string | null; cityCode: string | null; travelerCountry: string | null }

const ISO2 = /^[A-Za-z]{2}$/;
const CITY_CODE = /^[a-z0-9-]{2,80}$/;

/**
 * Lee y limpia los parámetros de la URL; lo inválido se descarta.
 * REQ-181: `country` y `travelerCountry` ya no deciden las reglas (salen de la reserva); se conservan solo por compatibilidad.
 */
export function parseTripQuery(sp: Record<string, string | string[] | undefined>): TripQuery {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const iso = (v: string) => (ISO2.test(v) ? v.toUpperCase() : null);
  const cc = one("cc").toLowerCase();
  return { country: iso(one("pais")), cityCode: CITY_CODE.test(cc) ? cc : null, travelerCountry: iso(one("viajero")) };
}

/**
 * REQ-120: id del carrito para el subID de afiliados, derivado del token privado de la reserva
 * sin exponerlo (hash FNV-1a; el token nunca sale a sitios de terceros). Puro y determinista.
 */
export function cartIdFromToken(token: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < token.length; i++) {
    const c = token.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x811c9dc5) >>> 0;
  }
  return `c${h1.toString(36)}${h2.toString(36)}`;
}

/** Qué ofrece cada categoría, en palabras del cliente. */
export const CATEGORY_TITLES: Record<CompanionCategory, string> = {
  tour: "Un tour para completar el día", day_trip: "Una excursión de un día", transfer: "Traslado del aeropuerto a tu hotel",
  esim: "eSIM con datos para tu viaje", tickets: "Entradas a atracciones", insurance: "Seguro de viaje",
  transport: "Transporte entre ciudades", car_rental: "Renta de auto", lodging: "Alojamiento",
  visa: "Asesoría de visa", etias: "Trámite ETIAS",
};
/** REQ-320: título de la tarjeta de tour cuando solo hay viajes de varios días cerca (no promete «completar el día»). */
export const MULTI_DAY_TITLE = "Viajes armados por expertos";
const CANDIDATE_TYPES: { type: CartItemType; category: CompanionCategory }[] = (
  ["tour", "day_trip", "transfer", "esim", "tickets", "insurance", "transport", "car_rental", "lodging", "visa"] as const
).map((t) => ({ type: t, category: t as CompanionCategory })).concat([{ type: "visa", category: "etias" }]);

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export interface ArmaTuViajeModel {
  piece: { title: string; when: string; cityName: string; status: "Confirmada"; cost: string } | null;
  /** REQ-184: tarjetas de escritorio y de celular; cada una dice dónde se pinta (`mobile`, `desktop`). */
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
  /** REQ-183: tipo de cambio para el MXN aproximado de una tarifa fija (null = solo EUR). */
  fx?: FxRates | null;
  /** REQ-320: experiencias ya cargadas cerca de la pieza (nearbyExperiences, sin FREETOUR). */
  experiences?: NearbyExperience[];
  /** REQ-324: adaptadores de solicitud cuyo proveedor ya sale en la tarjeta de tour (no se repiten). */
  coveredAdapterIds?: string[];
  /** REQ-323: países donde la eSIM sale con el asesor aunque no haya proveedor. */
  esimAdvisorCountries?: readonly string[];
}): ArmaTuViajeModel {
  const { piece, query } = input;
  if (!piece) return { piece: null, cards: [], cityCode: null };
  const cityCode = piece.cityCode ?? query.cityCode ?? (slug(piece.cityName) || null);
  // REQ-180: el día y la hora son los de la ciudad del tour.
  const day = pieceDay(piece.localDate, piece.date) ?? piece.date.slice(0, 10);
  const quoteCtx = { cityName: piece.cityName, dateFrom: day, people: piece.people };

  const experiences = (input.experiences ?? []).filter((e) => e.path.startsWith("/"));
  const covered = new Set(input.coveredAdapterIds ?? []);
  const esimCountries = (input.esimAdvisorCountries ?? ESIM_ADVISOR_COUNTRIES).map((c) => c.toUpperCase());
  const country = (piece.country ?? "").toUpperCase();

  const candidates = CANDIDATE_TYPES.map(({ type, category }) => {
    // REQ-320: tour o excursión con experiencias cercanas → las recomienda; el asesor queda como último recurso.
    if ((category === "tour" || category === "day_trip") && experiences.length) {
      return {
        type, category, title: experiences.every((e) => e.multiDay) ? MULTI_DAY_TITLE : CATEGORY_TITLES[category], chargedBy: "Travel Puzzle",
        action: { kind: "catalog" as const, label: "Ver experiencia" as const, url: experiences[0].path }, experiences,
      };
    }
    // REQ-324: lo que ya ofrece la tarjeta de tour no se pide otra vez por solicitud.
    const probes = (input.probes[category] ?? []).filter((p) => !covered.has(p.adapterId));
    let action = chooseAction(category, probes, input.advisor, quoteCtx);
    // REQ-323: sin proveedor de eSIM, «con el asesor» solo donde la regla lo pide (China).
    if (category === "esim" && action?.kind === "whatsapp" && !esimCountries.includes(country)) action = null;
    const chosen = action && action.kind !== "whatsapp" && action.kind !== "catalog" ? probes.find((p) => p.adapterId === action.adapterId) : undefined;
    return {
      type, category, title: CATEGORY_TITLES[category], chargedBy: chosen?.chargedBy ?? "Travel Puzzle", action,
      ...(action?.kind === "request" ? { priceLabel: "A cotizar" } : {}),
    };
  });

  const cards = buildCarousel({
    candidates,
    // REQ-181: país y viajero de la reserva, nunca de ?pais= / ?viajero=.
    context: { country: piece.country ?? "", cityCode: cityCode ?? "", travelerCountry: piece.travelerCountry ?? undefined, freeTourAt: piece.date, now: input.now },
    device: "both",
    rules: DEFAULT_RULES,
    flags: input.flags,
  });

  return {
    piece: {
      title: piece.title,
      when: pieceWhen(piece.localDate, piece.date) ?? shortDate(piece.date),
      cityName: piece.cityName,
      status: "Confirmada",
      // REQ-183
      cost: pieceCost(piece.price, piece.price && piece.price > 0 ? tourPriceLabel(piece.price, "EUR", input.fx ?? null, "es") : null),
    },
    cards,
    cityCode,
  };
}
