/**
 * Venta cruzada por lugar (ola X2a): transporte para la ficha de un tour y tours para la ficha de un transporte.
 * Recibe sus dependencias por parámetro; `crossSellDeps()` las arma con D1.
 */
import { pickByPlace, normPlace, type Place } from "./lib/match";
import type { TripCard } from "./public-load";
import { nearUnified } from "@/geo/lib/near";
import { parseCoords, type LatLng } from "@/map/lib/coords";
import { cityLatLng, type CityCoords } from "@/map/lib/city-pin";
import { FILLER_POINTS, FILLER_KM, distanceKm } from "@/geo/lib/centroid";

/** Lo que pinta la franja y la ventana (todo calculado en el servidor, REQ-008). */
export interface CrossItem { id: string; path: string; title: string; image: string | null; price: string | null }

export interface TourRow { id: string; title: string; image: string | null; price: string | null; cityName: string; countryCode: string }

export interface CrossSellDeps {
  /** Tarjetas publicadas visibles (respetan TRANSPORT_ENABLED). */
  tripCards(lang: string): Promise<TripCard[]>;
  /** Tours de Freetour de un país (los más reseñados primero). */
  toursInCountry(countryCode: string, lang: string): Promise<TourRow[]>;
}

/** REQ-10752: de dónde sale la ficha para el «Cerca» único: su punto (exacto o el de su ciudad) y su proveedor. */
export interface TransportOrigin { point: LatLng | null; provider: string | null }

/** REQ-10752: `unified` = `NEARBY_UNIFIED_ENABLED` (REQ-10751); apagada o sin opciones, la regla de hoy (`pickByPlace`). */
export interface TransportOptions { unified?: boolean; origin?: TransportOrigin }

const isFiller = (p: LatLng) => FILLER_POINTS.some((f) => distanceKm(f, p) < FILLER_KM);

/**
 * REQ-10752: origen de la ficha para `nearUnified`. Punto exacto del punto de encuentro si lo hay y no es relleno de
 * FREETOUR; si no, las coordenadas de su ciudad (REQ-10735); si tampoco, null: nunca se inventa un punto. Puro.
 */
export function transportOrigin(meetingPoint: { coordinates?: string | null } | null | undefined, city: CityCoords | null | undefined, provider: string | null | undefined): TransportOrigin {
  const exact = parseCoords(meetingPoint?.coordinates);
  const point = exact && !isFiller(exact) ? exact : cityLatLng(city);
  return { point, provider: provider ?? null };
}

/**
 * REQ-10752: elige las tarjetas de transporte de la franja. Con `unified`, la regla única de la decisión 29
 * (`nearUnified`: ciudad → país → radios de 300 y 800 km, lo más cercano primero cuando hay punto); apagada,
 * `pickByPlace` tal como hoy. Pura. `pickByPlace` no se borra.
 */
export function pickTransport(cards: TripCard[], place: Place, opts: TransportOptions = {}): TripCard[] {
  if (!opts.unified) return pickByPlace(cards, place);
  const candidates = cards.map((c) => ({ ...c, point: c.mapPoint ?? null }));
  const origin = { city: place.city, country: place.country, point: opts.origin?.point ?? null, provider: opts.origin?.provider ?? null };
  return nearUnified(candidates, origin).items;
}

// REQ-005, REQ-006, REQ-10752
export async function transportForPlace(place: Place, lang: string, d: CrossSellDeps, opts: TransportOptions = {}): Promise<CrossItem[]> {
  const cards = (await d.tripCards(lang)).filter((t) => t.kind === "transporte");
  return pickTransport(cards, place, opts).map((t) => ({ id: t.id, path: t.path, title: t.title, image: t.image, price: t.price?.main ?? null }));
}

// REQ-007
export async function toursForPlace(place: Place, lang: string, d: CrossSellDeps): Promise<CrossItem[]> {
  if (!place.country) return [];
  const rows = await d.toursInCountry(place.country, lang);
  const withPlace = rows.map((r) => ({ ...r, cities: [r.cityName], countries: [r.countryCode] }));
  return pickByPlace(withPlace, place).map((r) => ({ id: r.id, path: `/tours/${r.id}`, title: r.title, image: r.image, price: r.price }));
}

/** Nombre de la ciudad de un tour en el idioma pedido (respaldo: español, inglés). */
export function cityLabel(translations: unknown, lang: string): string | null {
  const t = (translations ?? {}) as Record<string, string | undefined>;
  return t[lang] ?? t.es ?? t.en ?? null;
}

export { normPlace };
