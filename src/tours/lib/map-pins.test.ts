import { describe, it, expect } from "vitest";
import { toursToPins, tripsToPins, type PinSource, type TripPinSource } from "./map-pins";
import { TRIP_KINDS } from "@/trips/lib/trip";
import { vi } from "vitest";

const base: PinSource = { id: "a", externalId: 1, title: "Tour A", image: "x.jpg", price: 0, currency: "EUR", meetingPoint: { coordinates: "41.38,2.17" } };

describe("pines del mapa de /tours", () => {
  it("un pin por tour con coordenadas válidas", () => {
    expect(toursToPins([base])).toEqual([{ id: "a", externalId: 1, title: "Tour A", image: "x.jpg", price: 0, currency: "EUR", lat: 41.38, lng: 2.17 }]);
  });
  it("descarta tours sin punto de encuentro o con coordenadas inválidas", () => {
    const pins = toursToPins([
      { ...base, id: "b", meetingPoint: null },
      { ...base, id: "c", meetingPoint: { coordinates: "0,0" } },
      { ...base, id: "d", meetingPoint: { coordinates: "foo" } },
      { ...base, id: "e", meetingPoint: "no-es-objeto" },
    ]);
    expect(pins).toEqual([]);
  });
  it("corrige coordenadas invertidas", () => {
    expect(toursToPins([{ ...base, meetingPoint: { coordinates: "141.38,2.17" } }])[0]).toMatchObject({ lat: 2.17, lng: 141.38 });
  });
});

const viaje = (over: Partial<TripPinSource> = {}): TripPinSource => ({ id: "t1", code: "IWP-PE-T01-001", path: "/viajes/peru/arequipa", title: "Arequipa", image: "a.jpg", priceFrom: 85, currency: "USD", mapPoint: { lat: -16.4, lng: -71.54 }, provider: "Inca Wonder Peru", ...over });

describe("REQ-3527: pines de los viajes en el mapa de /tours", () => {
  it("REQ-3527: un pin por viaje con punto, con su precio Desde, enlace a su ficha e id propio", () => {
    expect(tripsToPins([viaje()])).toEqual([{ id: "trip:t1", title: "Arequipa", image: "a.jpg", price: 85, currency: "USD", lat: -16.4, lng: -71.54, href: "/viajes/peru/arequipa", provider: "Inca Wonder Peru" }]);
  });
  it("REQ-3527: el id del viaje no choca con el de un tour que se llame igual", () => {
    const [p] = tripsToPins([viaje({ id: "a" })]);
    expect(p.id).not.toBe(toursToPins([base])[0].id);
  });
  it("REQ-3527: sin precio el pin queda en cotizar (price 0 y onRequest)", () => {
    expect(tripsToPins([viaje({ priceFrom: null })])[0]).toMatchObject({ price: 0, onRequest: true });
    expect(tripsToPins([viaje({ priceFrom: 0 })])[0]).toMatchObject({ price: 0, onRequest: true });
  });
  it("REQ-3527: un viaje sin punto no se pinta y se registra con su código", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(tripsToPins([viaje({ id: "x", code: "EXT-FR-T01-001", mapPoint: null })])).toEqual([]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("EXT-FR-T01-001"));
    log.mockRestore();
  });
  it("REQ-3527: no toca los pines de tours", () => {
    expect(toursToPins([base])).toHaveLength(1);
  });
});

describe("REQ-3528: catálogo único automático (contrato REQ-1605)", () => {
  it("REQ-3528: todo tipo de viaje sale en el mapa, sin lista de tipos", () => {
    const pins = tripsToPins(TRIP_KINDS.map((kind, i) => viaje({ id: `k${i}`, code: `K-${kind}`, kind })));
    expect(pins).toHaveLength(TRIP_KINDS.length);
  });
  it("REQ-3528: un proveedor o agencia inventado sale igual que los de hoy", () => {
    const pins = tripsToPins([viaje({ id: "n1", provider: "Proveedor Nuevo 2027", code: "NEW-XX-T01-001" }), viaje({ id: "n2", provider: null, code: "OWN-1" })]);
    expect(pins.map((p) => p.id)).toEqual(["trip:n1", "trip:n2"]);
  });
});
