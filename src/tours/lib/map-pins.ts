/** Pines del mapa de /tours a partir de los tours de la página. Pura. */
import { parseCoords } from "@/map/lib/coords";

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
  externalId: number;
  title: string;
  image: string | null;
  price: number;
  currency: string;
  lat: number;
  lng: number;
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
