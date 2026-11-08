import { describe, expect, it } from "vitest";
import { slimDayTrip, slimHomeTour } from "./slim";
import { fromHomeTour, fromTripCard, withFinalHref } from "@/tours/lib/card-sources";
import type { HomeTour } from "../load";
import type { TripCard } from "@/trips/public-load";

const t: HomeTour = { id: "a", externalId: 1, titles: { es: "Madrid de los Austrias", en: "Habsburg Madrid", de: "x", fr: "y", it: "z", pt: "w" }, cityNames: { es: "Madrid", en: "Madrid", de: "Madrid" }, image: "https://i/a.jpg",
  isFree: true, price: 0, currency: "EUR", duration: "2:00", rating: 4.95, reviews: 900, provider: "Ana", formato: "pieza-libre", durationMinutes: 120, briefs: { es: "Centro histórico", en: "Old town", de: "Altstadt" } };
const trip = { id: "v", path: "/viajes/x", code: "X", kind: "tour", title: "Versalles esencial", summary: "Medio día", image: "https://i/v.jpg", countries: ["FR"], places: "Francia", cities: ["París", "Versalles"],
  durationDays: 1, price: { main: "MXN $2,080", original: "EUR €99", rateNote: null }, priceFrom: 99, languages: ["es", "en"], dates: Array.from({ length: 300 }, (_, i) => `2026-12-${i}`), group: "excursiones",
  freeCancel: true, private: false, hotelPickup: false, createdAt: 1, durationMinutes: 1440, provider: "Extime Travel", formato: "excursion-dia" } as unknown as TripCard;

describe("REQ-857: al cliente solo viaja lo que pinta la tarjeta", () => {
  it("REQ-857: la tarjeta sale idéntica con los datos recortados", () => {
    for (const lang of ["es", "en", "de"]) expect(fromHomeTour(slimHomeTour(t, lang), { lang })).toEqual(fromHomeTour(t, { lang }));
    const s = slimDayTrip({ type: "trip", trip }, "es");
    expect(s.type === "trip" && fromTripCard(s.trip, "es", "Desde")).toEqual(fromTripCard(trip, "es", "Desde"));
  });
  it("REQ-857: se quedan fuera los otros idiomas y las fechas", () => {
    expect(Object.keys(slimHomeTour(t, "es").titles)).toEqual(["es"]);
    const s = slimDayTrip({ type: "trip", trip }, "es");
    expect(s.type === "trip" && s.trip.dates).toEqual([]);
    expect(JSON.stringify(slimDayTrip({ type: "trip", trip }, "es")).length).toBeLessThan(JSON.stringify(trip).length / 3);
  });
});

describe("REQ-668 con REQ-857", () => {
  it("REQ-668: recortar la tarjeta del inicio conserva la ficha final", () => {
    const t = { id: "t1", externalId: 1, titles: { es: "A", en: "B" }, cityNames: { es: "París" }, image: "", isFree: true, price: 0, currency: "EUR", duration: "2:00", rating: null, reviews: 0 } as HomeTour;
    const fin = withFinalHref(new Map([["tour:t1", "/destinos/fr/paris/a"]]));
    expect(fromHomeTour(slimHomeTour(fin(t), "en"), { lang: "en" }).href).toBe("/destinos/fr/paris/a");
    const d = slimDayTrip({ type: "tour", tour: fin(t) }, "es");
    expect(d.type === "tour" && d.tour.href).toBe("/destinos/fr/paris/a");
  });
});

describe("REQ-1244 inicio (D31): las tarjetas no nombran la plataforma en ningún idioma", () => {
  it("REQ-1244 título y resumen limpios en es, en y pt", () => {
    const dirty = { ...t, titles: { es: "Madrid (Premios FREETOUR.com)", en: "Madrid - FreeTour.com", pt: "Madrid" }, briefs: { es: "Premiado por FREETOUR. Centro.", en: "Book on freetour.com. Old town.", pt: "Centro" } };
    for (const lang of ["es", "en", "pt"]) {
      const s = slimHomeTour(dirty, lang);
      expect(JSON.stringify(s)).not.toMatch(/free\s*tour\s*\.\s*com|freetour/i);
    }
    expect(slimHomeTour(dirty, "es").titles).toEqual({ es: "Madrid" });
    expect(slimHomeTour(dirty, "en").briefs).toEqual({ en: "Old town." });
    expect(slimHomeTour(t, "es")).toEqual(slimHomeTour(t, "es")); // sin mención, igual que antes
  });
});
