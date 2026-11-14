import { describe, it, expect } from "vitest";
import { toCard } from "./public-load";

// REQ-3526: la tarjeta de un viaje lleva su punto de encuentro para el mapa de /tours.
const base = {
  id: "t1", slug: "kuelap", code: "IWP-PE-T01-001", kind: "tour", status: "published", titleEs: "Kuélap", titleEn: "", summaryEs: "Resumen", summaryEn: "", descriptionEs: "", descriptionEn: "",
  countries: ["PE"], cities: ["Chachapoyas"], durationDays: 1, priceFrom: 85, currency: "USD", priceNote: "", dates: [], hotelPickup: false, itinerary: [], includes: [], excludes: [], visaInfo: "",
  images: [], languages: [], options: [], extras: [], highlights: [], category: null,
  availability: { weekdays: [], slots: [], closedDates: [], seasons: [] }, cancellation: { type: "standard", tiers: [] }, minNoticeHours: 24,
  meetingPoints: [{ name: "Plaza", address: "", lat: -6.23, lng: -77.87, instructions: "", photoKey: null }],
};

describe("REQ-3526: TripCard.mapPoint", () => {
  it("REQ-3526: trae el primer punto de encuentro con coordenadas", () => {
    expect(toCard(base as never, "es", null).mapPoint).toEqual({ lat: -6.23, lng: -77.87 });
  });
  it("REQ-3527: trae la moneda del precio Desde para el pin", () => {
    expect(toCard(base as never, "es", null).currency).toBe("USD");
  });
  it("REQ-3526: es null si el viaje no tiene punto con coordenadas", () => {
    expect(toCard({ ...base, meetingPoints: [{ name: "Sin ubicación", address: "", lat: null, lng: null, instructions: "", photoKey: null }] } as never, "es", null).mapPoint).toBeNull();
  });
});
