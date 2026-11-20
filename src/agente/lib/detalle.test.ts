// REQ-3354: ficha completa del viaje para el agente (Mila). Nunca neto, margen, datos de clientes ni FREETOUR.
import { describe, it, expect } from "vitest";
import { fichaParaAgente } from "./detalle";

const trip = {
  id: "t1", slug: "triangulo-de-oro", code: "TP-0001", kind: "circuito", agencyId: "exotic", status: "published",
  titleEs: "Triángulo de Oro", summaryEs: "Delhi, Agra y Jaipur", descriptionEs: "Circuito clásico de la India.",
  highlights: ["Taj Mahal al amanecer"], importantInfo: "Pasaporte con 6 meses de vigencia.", whatToBring: "Ropa ligera", accessibility: "", difficulty: "facil",
  countries: ["India"], cities: ["Delhi", "Agra", "Jaipur"], durationDays: 6, flightsIncluded: false, languages: ["es"], minPax: 2, maxPax: 16,
  currency: "USD", priceFrom: 1300, priceNote: "Por persona en habitación doble",
  options: [{ id: "o1", name: "Doble", mode: "group", adult: 1300, child: 1100, infant: null, childAgeMin: 2, childAgeMax: 11 }],
  extras: [{ name: "Suplemento individual", price: 400, perPerson: true }],
  cancellation: { type: "custom", tiers: [{ daysBefore: 30, refundPct: 100 }, { daysBefore: 15, refundPct: 50 }] },
  dates: [{ date: "2027-04-01", times: [] }], meetingPoints: [{ name: "Aeropuerto de Delhi", address: "Terminal 3" }], hotelPickup: true, endPoint: "Delhi",
  itinerary: [{ title: "Día 1 · Delhi", text: "Llegada y traslado." }], includes: ["Hoteles 4*"], excludes: ["Vuelos internacionales"], visaInfo: "Visa electrónica.",
  images: [{ key: "a.jpg", alt: "Taj Mahal" }, { key: "b.jpg", alt: "Jaipur" }], videoUrl: "", videoCaption: "",
  neto: 1000, markup: 0.3, translations: {},
} as never;

describe("REQ-3354: ficha completa del viaje para Mila", () => {
  it("REQ-3354: trae descripción, itinerario, incluye/no incluye, opciones con precio final, extras, cancelación, punto de encuentro, fotos y liga", () => {
    const f = fichaParaAgente(trip, "https://travelpuzzle.com.mx", "/viajes/triangulo-de-oro");
    expect(f).toMatchObject({
      slug: "triangulo-de-oro", titulo: "Triángulo de Oro", duracionDias: 6, moneda: "USD",
      opciones: [{ nombre: "Doble", adulto: 1300, nino: 1100, edadNino: "2 a 11" }],
      extras: [{ nombre: "Suplemento individual", precio: 400, porPersona: true }],
      itinerario: [{ titulo: "Día 1 · Delhi", texto: "Llegada y traslado." }],
      incluye: ["Hoteles 4*"], noIncluye: ["Vuelos internacionales"], visa: "Visa electrónica.",
      puntoEncuentro: [{ nombre: "Aeropuerto de Delhi", direccion: "Terminal 3" }], recogeEnHotel: true,
      enlace: "https://travelpuzzle.com.mx/viajes/triangulo-de-oro",
    });
    expect(f.cancelacion).toBe("Reembolso del 100 % hasta 30 días antes; 50 % hasta 15 días antes; después, sin reembolso.");
    expect(f.fotos).toEqual([{ url: "https://travelpuzzle.com.mx/api/viajes/foto/a.jpg", alt: "Taj Mahal" }, { url: "https://travelpuzzle.com.mx/api/viajes/foto/b.jpg", alt: "Jaipur" }]);
  });
  it("REQ-3354: nunca expone neto, margen, ids internos ni traducciones crudas", () => {
    const txt = JSON.stringify(fichaParaAgente(trip, "https://travelpuzzle.com.mx", "/viajes/x"));
    for (const k of ["neto", "markup", "agencyId", "translations", "\"id\""]) expect(txt).not.toContain(k);
  });
  it("REQ-3354: cancelación estándar sin escalones y sin cancelación", () => {
    expect(fichaParaAgente({ ...(trip as object), cancellation: { type: "none", tiers: [] } } as never, "https://x", "/v").cancelacion).toBe("No admite cancelación con reembolso.");
  });
});
