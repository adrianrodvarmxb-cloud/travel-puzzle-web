import { describe, expect, it } from "vitest";
import { slimDayTrip, slimHomeTour } from "./slim";
import { fromHomeTour, fromTripCard } from "@/tours/lib/card-sources";
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
