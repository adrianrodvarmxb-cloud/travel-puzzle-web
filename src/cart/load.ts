/**
 * REQ-106: lee la Primera Pieza (free tour ya reservado) a partir del token privado de la reserva.
 * REQ-180 / REQ-181 / REQ-183: también la hora local, el país y la ciudad del catálogo, el país del viajero
 * (prefijo del teléfono; el teléfono no sale de aquí) y el precio guardado en la reserva.
 * I/O inyectado: la página le pasa los lectores reales. Si algo falla, no hay pieza (nunca rompe la página).
 */
import type { TripPiece } from "./lib/page-model";
import { travelerCountryFromPhone } from "./lib/piece";

export interface FirstPieceDeps {
  view(token: string): Promise<{
    status: string;
    record: {
      tourExternalId: number | null; eventDate: string | null; eventUtcDate: string | null; adults: number; children: number;
      price?: number | null; phone?: string | null;
    };
  } | null>;
  summary(tourExternalId: number): Promise<{ title: string; cityName: string | null; country?: string | null; citySlug?: string | null } | null>;
}

const ISO2 = /^[A-Z]{2}$/;

export async function loadFirstPiece(token: string | undefined, deps: FirstPieceDeps): Promise<TripPiece | null> {
  if (!token || !/^[A-Za-z0-9_-]{8,200}$/.test(token)) return null;
  try {
    const view = await deps.view(token);
    if (!view || view.status !== "active") return null;
    const { record } = view;
    const date = record.eventUtcDate ?? record.eventDate;
    if (!record.tourExternalId || !date) return null;
    const tour = await deps.summary(record.tourExternalId);
    if (!tour?.cityName) return null;
    const country = tour.country?.trim().toUpperCase() ?? "";
    return {
      title: tour.title,
      date,
      cityName: tour.cityName,
      people: { adults: record.adults, children: record.children },
      localDate: record.eventDate ?? null,
      country: ISO2.test(country) ? country : null,
      cityCode: tour.citySlug && /^[a-z0-9-]{2,80}$/.test(tour.citySlug) ? tour.citySlug : null,
      travelerCountry: travelerCountryFromPhone(record.phone),
      price: typeof record.price === "number" && Number.isFinite(record.price) ? record.price : 0,
    };
  } catch (error) {
    console.error("[arma-tu-viaje] no se pudo leer la Primera Pieza:", (error as Error).message);
    return null;
  }
}
