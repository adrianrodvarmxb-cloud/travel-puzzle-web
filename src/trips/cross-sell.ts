/**
 * Venta cruzada por lugar (ola X2a): transporte para la ficha de un tour y tours para la ficha de un transporte.
 * Recibe sus dependencias por parámetro; `crossSellDeps()` las arma con D1.
 */
import { pickByPlace, normPlace, type Place } from "./lib/match";
import { complementItems, type ProviderTransfer } from "./lib/transfer-cross-sell";
import type { TripCard } from "./public-load";

/** Lo que pinta la franja y la ventana (todo calculado en el servidor, REQ-008). */
export interface CrossItem { id: string; path: string; title: string; image: string | null; price: string | null }

export interface TourRow { id: string; title: string; image: string | null; price: string | null; cityName: string; countryCode: string }

export interface CrossSellDeps {
  /** Tarjetas publicadas visibles (respetan TRANSPORT_ENABLED). */
  tripCards(lang: string): Promise<TripCard[]>;
  /** Tours de Freetour de un país (los más reseñados primero). */
  toursInCountry(countryCode: string, lang: string): Promise<TourRow[]>;
  /** REQ-3428: traslados y transporte turístico de proveedor de un país, ya validados y sin nombre de proveedor. */
  providerTransfersInCountry(countryCode: string, lang: string): Promise<ProviderTransfer[]>;
}

// REQ-005, REQ-006, REQ-3428
export async function transportForPlace(place: Place, lang: string, d: CrossSellDeps): Promise<CrossItem[]> {
  const cards = (await d.tripCards(lang)).filter((t) => t.kind === "transporte");
  const own = pickByPlace(cards, place).map((t) => ({ id: t.id, path: t.path, title: t.title, image: t.image, price: t.price?.main ?? null }));
  // REQ-3428: si los traslados de proveedor fallan, la franja sigue con los viajes propios (regla 7 del blindaje).
  const transfers = place.country
    ? await d.providerTransfersInCountry(place.country, lang).catch((e) => { console.error("[venta cruzada] traslados de proveedor:", (e as Error).message); return [] as ProviderTransfer[]; })
    : [];
  return complementItems(own, transfers, place);
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
