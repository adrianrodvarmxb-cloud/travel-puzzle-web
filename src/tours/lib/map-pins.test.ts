import { describe, it, expect } from "vitest";
import { toursToPins, type PinSource } from "./map-pins";

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
