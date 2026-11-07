/**
 * REQ-857 (PO, 6-11 22:05: el HTML del inicio no debe crecer más de 10 %): a los carruseles del cliente solo viaja lo
 * que pinta la tarjeta, en el idioma de la visita (el resto de idiomas, fechas y filtros se quedan en el servidor). Puro.
 */
import type { HomeDayTrip, HomeTour } from "../load";
import type { TripCard } from "@/trips/public-load";
import { nameIn } from "./destinations";

const pick = (m: Record<string, string> | undefined, lang: string): Record<string, string> => {
  const v = m ? nameIn(m, lang) : "";
  return v ? { [lang]: v } : {};
};

// REQ-857
export function slimHomeTour(t: HomeTour, lang: string): HomeTour {
  return { ...t, titles: pick(t.titles, lang), cityNames: pick(t.cityNames, lang), ...(t.briefs ? { briefs: pick(t.briefs, lang) } : {}) };
}

// REQ-857: solo los campos que usa fromTripCard.
export function slimTripCard(t: TripCard): TripCard {
  return {
    id: t.id, path: t.path, code: t.code, kind: t.kind, title: t.title, summary: t.summary, image: t.image, countries: [], places: t.places,
    cities: t.cities.slice(0, 1), durationDays: t.durationDays, price: t.price, priceFrom: t.priceFrom, languages: [], dates: [], group: "",
    freeCancel: false, private: false, hotelPickup: false, createdAt: 0, durationMinutes: null, provider: t.provider ?? null, formato: t.formato,
  };
}

// REQ-857
export function slimDayTrip(d: HomeDayTrip, lang: string): HomeDayTrip {
  return d.type === "tour" ? { type: "tour", tour: slimHomeTour(d.tour, lang) } : { type: "trip", trip: slimTripCard(d.trip) };
}
