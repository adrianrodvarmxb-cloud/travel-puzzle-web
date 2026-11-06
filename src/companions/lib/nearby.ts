/**
 * REQ-320…322 / REQ-324: experiencias ya cargadas cerca de la Primera Pieza, para la tarjeta de tour de
 * «Arma tu viaje». Búsqueda por cercanía: 1) misma ciudad, 2) mismo país, 3) por coordenadas a 300 km y,
 * si no hay nada, a 800 km. Nunca entra un tour de FREETOUR (regla B3 firmada por el PO). Puro: el precio
 * se arma en el servidor con idioma fijo (INC-001).
 */
import { parseCoords } from "@/map/lib/coords";
import { distanceKm, FILLER_KM, FILLER_POINTS, type Point } from "@/geo/lib/centroid";
import { normPlace } from "@/trips/lib/match";
import { optionPrice, type FxRates } from "@/trips/lib/money";

/** REQ-320: radios por coordenadas, en orden (propuesta para firma del PO). */
export const NEARBY_RADII_KM = [300, 800] as const;
/** REQ-320: experiencias por tarjeta. */
export const MAX_EXPERIENCES = 3;
/** REQ-321: proveedores que nunca entran a la tarjeta (regla B3). */
export const EXCLUDED_PROVIDERS = ["freetour"] as const;

export interface NearbyCandidate {
  /** Fuente: "trip" = gestor de viajes (propios y agencias, incluye Big Bus); "freetour" = catálogo FREETOUR. */
  provider: string;
  id: string;
  kind: string;
  title: string;
  path: string;
  image: string | null;
  cities: string[];
  countries: string[];
  point: Point | null;
  priceFrom: number | null;
  currency: "MXN" | "USD" | "EUR";
  durationDays: number | null;
  agencyName: string | null;
}

export interface NearbyExperience {
  id: string;
  title: string;
  path: string;
  image: string | null;
  /** «Desde USD $35 (aprox. MXN $648)» o «A cotizar». */
  price: string;
  /** Quién opera (agencia); null = Travel Puzzle. */
  operator: string | null;
}

export type NearbyTier = "city" | "country" | `radius-${(typeof NEARBY_RADII_KM)[number]}`;
export interface NearbyResult { tier: NearbyTier | null; items: NearbyExperience[] }

export interface NearbyOrigin { cityName: string; country: string | null; point: Point | null }

const round = (n: number) => Math.round(n * 1e5) / 1e5;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const isFiller = (p: Point) => FILLER_POINTS.some((f) => distanceKm(f, p) < FILLER_KM);
const medianPoint = (ps: Point[]): Point | null => (ps.length ? { lat: round(median(ps.map((p) => p.lat))), lng: round(median(ps.map((p) => p.lng))) } : null);

/**
 * REQ-322: punto de origen = punto de encuentro del tour reservado ("lat,lng" de FREETOUR). Si falta o es el
 * relleno de Greenwich, la mediana de los puntos de encuentro de su ciudad.
 */
export function originPoint(tourCoords: string | null | undefined, cityCoords: (string | null)[]): Point | null {
  const own = parseCoords(tourCoords);
  if (own && !isFiller(own)) return own;
  return medianPoint(cityCoords.map((c) => parseCoords(c)).filter((p): p is Point => !!p && !isFiller(p)));
}

/** REQ-322: punto de un viaje = mediana de las lat/lng de sus puntos de encuentro. */
export function tripPoint(points: { lat: number | null; lng: number | null }[]): Point | null {
  return medianPoint(points.flatMap((p) => (typeof p.lat === "number" && typeof p.lng === "number" && !(p.lat === 0 && p.lng === 0) ? [{ lat: p.lat, lng: p.lng }] : [])));
}

/** Una experiencia de un día (tour, entrada, bus) va antes que un circuito de varios días. */
const isDay = (c: NearbyCandidate) => c.kind !== "circuito" && c.kind !== "personalizado" && (c.durationDays ?? 1) <= 1;

function priceText(c: NearbyCandidate, fx: FxRates | null): string {
  if (c.priceFrom === null || !(c.priceFrom > 0)) return "A cotizar";
  return `Desde ${optionPrice(c.priceFrom, c.currency, fx, "es")}`;
}

// REQ-320, REQ-321
export function nearbyExperiences(input: { origin: NearbyOrigin; candidates: NearbyCandidate[]; fx: FxRates | null; max?: number }): NearbyResult {
  const max = input.max ?? MAX_EXPERIENCES;
  const { origin } = input;
  const usable = input.candidates.filter((c) =>
    !EXCLUDED_PROVIDERS.includes(c.provider.trim().toLowerCase() as (typeof EXCLUDED_PROVIDERS)[number]) &&
    c.title.trim() !== "" && c.path.startsWith("/"));
  const dist = (c: NearbyCandidate) => (origin.point && c.point ? distanceKm(origin.point, c.point) : Number.POSITIVE_INFINITY);
  const pick = (tier: NearbyTier, list: NearbyCandidate[]): NearbyResult => ({
    tier,
    items: list
      .map((c, i) => ({ c, i, d: dist(c) }))
      .sort((a, b) => Number(isDay(b.c)) - Number(isDay(a.c)) || a.d - b.d || a.i - b.i)
      .slice(0, max)
      .map(({ c }) => ({ id: c.id, title: c.title.trim(), path: c.path, image: c.image, price: priceText(c, input.fx), operator: c.agencyName })),
  });

  const city = normPlace(origin.cityName);
  if (city) {
    const sameCity = usable.filter((c) => c.cities.some((x) => normPlace(x) === city));
    if (sameCity.length) return pick("city", sameCity);
  }
  const country = origin.country?.toUpperCase();
  if (country) {
    const sameCountry = usable.filter((c) => c.countries.some((x) => x.toUpperCase() === country));
    if (sameCountry.length) return pick("country", sameCountry);
  }
  if (origin.point) {
    for (const km of NEARBY_RADII_KM) {
      const near = usable.filter((c) => dist(c) <= km);
      if (near.length) return pick(`radius-${km}`, near);
    }
  }
  return { tier: null, items: [] };
}

/**
 * REQ-324: entradas de solicitud del registro (p. ej. Big Bus) cuyo proveedor ya sale en la tarjeta de tour:
 * no se repiten en otra tarjeta. Se compara por nombre (dato del registro contra la agencia del viaje).
 */
export function coveredRequestEntries(entries: { id: string; adapter: string; provider: string }[], shown: { operator: string | null }[]): string[] {
  const ops = shown.map((s) => (s.operator ? normPlace(s.operator) : "")).filter(Boolean);
  return entries.filter((e) => e.adapter === "request" && ops.some((o) => o.includes(normPlace(e.provider)))).map((e) => e.id);
}
