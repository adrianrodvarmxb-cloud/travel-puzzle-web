import { describe, it, expect } from "vitest";
import { parseTourRankRows, tripCandidate } from "./rank-row";

const row = (o: Record<string, unknown> = {}) => ({
  id: "t1", externalId: 10, cityId: 5, cityName: "Madrid", countryCode: "es", categoryId: 4, durationMinutes: 600,
  price: "0", rating: "4.9", reviews: 120, titleEs: "Excursión a Toledo desde Madrid", titleEn: "Toledo day trip", ...o,
});

describe("REQ-185: filas de la base validadas antes de rankear", () => {
  it("REQ-185: convierte decimales de D1 (texto o bigint) y calcula formato y excursión", () => {
    const { ok, dropped } = parseTourRankRows([row({ reviews: BigInt(120) })]);
    expect(dropped).toBe(0);
    expect(ok[0]).toMatchObject({ key: "tour:t1", city: "madrid", country: "ES", rating: 4.9, reviews: 120, format: "pieza-libre", dayTrip: true, hasReviewSystem: true });
  });

  it("REQ-185: una fila mala se descarta y se cuenta; las buenas siguen", () => {
    const { ok, dropped } = parseTourRankRows([row({ id: "" }), row({ reviews: -3 }), row({ price: "abc" }), null, row({ id: "t2" })]);
    expect(dropped).toBe(4);
    expect(ok.map((x) => x.id)).toEqual(["t2"]);
  });

  it("REQ-189: se salta la experiencia cuyo título (es o en) dice FreeTour o «free tour»", () => {
    const { ok, branded } = parseTourRankRows([row({ id: "a", titleEs: "Free Tour de Budapest" }), row({ id: "b", titleEn: "FREETOUR Lima" }), row({ id: "c" })]);
    expect(ok.map((x) => x.id)).toEqual(["c"]);
    expect(branded).toBe(2);
  });

  it("REQ-185: sin nombre de ciudad usa el id (la diversidad no se rompe)", () => {
    expect(parseTourRankRows([row({ cityName: null })]).ok[0].city).toBe("city:5");
  });
});

describe("REQ-188: viajes propios como candidatas", () => {
  it("REQ-188: sin sistema de reseñas; ciudad y país normalizados; excursión según el título en es o en", () => {
    const c = tripCandidate({ id: "v1", kind: "tour", durationDays: 1, cities: ["Lima", "Paracas"], countries: ["pe"], titles: ["Paracas e Islas Ballestas desde Lima", ""] });
    expect(c).toMatchObject({ key: "trip:v1", city: "lima", country: "PE", format: "excursion-dia", dayTrip: true, hasReviewSystem: false, reviews: 0, rating: null });
    expect(tripCandidate({ id: "v3", kind: "tour", durationDays: 1, cities: ["Cusco"], countries: ["PE"], dayTrip: true })).toMatchObject({ dayTrip: true, format: "excursion-dia" });
    expect(tripCandidate({ id: "v2", kind: "circuito", durationDays: 8, cities: ["Cusco"], countries: ["PE"], titles: ["Perú desde Lima"] }).dayTrip).toBe(false);
  });
});
