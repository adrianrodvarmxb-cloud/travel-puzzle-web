/** Pines del mapa de /tours a partir de los tours de la página. Pura. */
import { parseCoords, type LatLng } from "@/map/lib/coords";

export interface PinSource {
  id: string;
  externalId: number;
  title: string;
  image: string | null;
  price: number;
  currency: string;
  meetingPoint: unknown;
}

export interface TourPin {
  id: string;
  /** Solo los tours del catálogo (Freetour) lo traen. */
  externalId?: number;
  title: string;
  image: string | null;
  price: number;
  currency: string;
  lat: number;
  lng: number;
  /** REQ-3527: enlace de la tarjeta del pin; los tours usan `/tours/{id}`, los viajes su ficha `/viajes/…`. */
  href?: string;
  /** REQ-3527: proveedor o agencia del viaje (null = Travel Puzzle). */
  provider?: string | null;
  /** REQ-3527: el viaje no tiene precio «Desde»; el pin dice «Cotizar» y no «Free tour». */
  onRequest?: boolean;
}

/** REQ-3527: lo mínimo de una tarjeta de viaje (`TripCard`) para pintarla en el mapa. Sin proveedor ni tipo: cualquiera entra (REQ-3528). */
export interface TripPinSource {
  id: string;
  code: string;
  path: string;
  title: string;
  image: string | null;
  priceFrom: number | null;
  currency?: string;
  mapPoint?: LatLng | null;
  provider?: string | null;
  kind?: string;
}

function coordsOf(meetingPoint: unknown): string | null {
  if (!meetingPoint || typeof meetingPoint !== "object") return null;
  const c = (meetingPoint as { coordinates?: unknown }).coordinates;
  return typeof c === "string" ? c : null;
}

/** Un pin por tour con punto de encuentro válido; los demás se omiten. */
export function toursToPins(tours: PinSource[]): TourPin[] {
  const pins: TourPin[] = [];
  for (const t of tours) {
    const p = parseCoords(coordsOf(t.meetingPoint));
    if (!p) continue;
    const { meetingPoint: _omit, ...rest } = t;
    void _omit;
    pins.push({ ...rest, lat: p.lat, lng: p.lng });
  }
  return pins;
}

/**
 * REQ-3527 / REQ-3528 (regla de catálogo único, REQ-1605): un pin por viaje con punto de encuentro, de cualquier proveedor,
 * agencia o tipo. A propósito no recibe ni filtra por proveedor ni por tipo: un proveedor nuevo entra solo.
 * Un viaje sin punto no se pinta y queda registrado con su código.
 */
export function tripsToPins(trips: TripPinSource[]): TourPin[] {
  const pins: TourPin[] = [];
  for (const t of trips) {
    if (!t.mapPoint) {
      console.error(`[mapa] viaje ${t.code} sin punto de encuentro con coordenadas; no se pinta`);
      continue;
    }
    const price = t.priceFrom !== null && t.priceFrom > 0 && t.currency ? t.priceFrom : 0; // sin moneda no se inventa una: queda en «Cotizar»
    pins.push({
      id: `trip:${t.id}`, title: t.title, image: t.image, price, currency: t.currency ?? "",
      lat: t.mapPoint.lat, lng: t.mapPoint.lng, href: t.path, provider: t.provider ?? null,
      ...(price > 0 ? {} : { onRequest: true }),
    });
  }
  return pins;
}
