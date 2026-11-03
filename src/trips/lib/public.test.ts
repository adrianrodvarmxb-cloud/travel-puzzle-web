import { describe, it, expect } from "vitest";
import { tripPath, matchesToursFilter, isOwnKindFilter, OWN_KIND_FILTERS } from "./public";

describe("tripPath (gate K)", () => {
  it("/viajes/{destino}/{nombre-código}", () => {
    expect(tripPath({ slug: "oaxaca-clase-de-cocina-tp-mx-e01-007", countries: ["MX"] })).toBe("/viajes/mexico/oaxaca-clase-de-cocina-tp-mx-e01-007");
    expect(tripPath({ slug: "europa-emv-eur-c15-042", countries: ["ES", "FR"] })).toBe("/viajes/europa/europa-emv-eur-c15-042");
    expect(tripPath({ slug: "x", countries: ["MX", "JP"] })).toBe("/viajes/mundo/x");
    expect(tripPath({ slug: "x", countries: [] })).toBe("/viajes/mundo/x");
  });
});

describe("mezcla en /tours (gate L)", () => {
  const trip = { countries: ["MX"], kind: "circuito" as const };
  it("coincide por país del filtro y por tipo", () => {
    expect(matchesToursFilter(trip, { countryCode: null, kind: "all" })).toBe(true);
    expect(matchesToursFilter(trip, { countryCode: "MX", kind: "all" })).toBe(true);
    expect(matchesToursFilter(trip, { countryCode: "ES", kind: "all" })).toBe(false);
    expect(matchesToursFilter(trip, { countryCode: null, kind: "circuito" })).toBe(true);
    expect(matchesToursFilter(trip, { countryCode: null, kind: "tour" })).toBe(false);
    expect(matchesToursFilter(trip, { countryCode: null, kind: "free" })).toBe(false);
  });
  it("tipos de filtro", () => {
    expect(OWN_KIND_FILTERS).toEqual(["tour", "circuito", "unica"]);
    expect(isOwnKindFilter("circuito")).toBe(true);
    expect(isOwnKindFilter("free")).toBe(false);
  });
});
