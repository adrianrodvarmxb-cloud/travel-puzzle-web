import { describe, it, expect } from "vitest";
import { tripPath, matchesToursFilter, isOwnKindFilter, OWN_KIND_FILTERS, visibleKindFilters } from "./public";

describe("tripPath (gate K)", () => {
  it("/viajes/{destino}/{nombre-código}", () => {
    expect(tripPath({ slug: "oaxaca-clase-de-cocina-tp-mx-e01-007", countries: ["MX"] })).toBe("/viajes/mexico/oaxaca-clase-de-cocina-tp-mx-e01-007");
    expect(tripPath({ slug: "europa-emv-eur-c15-042", countries: ["ES", "FR"] })).toBe("/viajes/europa/europa-emv-eur-c15-042");
    expect(tripPath({ slug: "x", countries: ["MX", "JP"] })).toBe("/viajes/mundo/x");
    expect(tripPath({ slug: "x", countries: [] })).toBe("/viajes/mundo/x");
  });
});

describe("chips visibles", () => {
  it("solo los tipos que existen (todo y free siempre)", () => {
    expect(visibleKindFilters(["transporte", "tour"])).toEqual(["all", "free", "tour", "transporte"]);
    expect(visibleKindFilters([])).toEqual(["all", "free"]);
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
    expect(OWN_KIND_FILTERS).toEqual(["tour", "circuito", "unica", "transporte"]);
    expect(isOwnKindFilter("transporte")).toBe(true);
    expect(matchesToursFilter({ countries: ["FR"], kind: "transporte" }, { countryCode: "FR", kind: "transporte" })).toBe(true);
    expect(matchesToursFilter({ countries: ["FR"], kind: "tour" }, { countryCode: "FR", kind: "transporte" })).toBe(false);
    expect(isOwnKindFilter("circuito")).toBe(true);
    expect(isOwnKindFilter("free")).toBe(false);
  });
});

// REQ-046 (INC-004): los viajes propios respetan el buscador y los filtros de /tours
describe("REQ-046 matchesToursFilter con búsqueda, ciudad y precio", () => {
  const mp = { countries: ["PE"], kind: "tour" as const, title: "Machu Picchu Full Day desde Cusco", summary: "Tren, bus y entrada", cities: ["Cusco", "Aguas Calientes"], places: "Perú", priceFrom: 546 };
  const f = (o: Record<string, unknown> = {}) => ({ countryCode: null, kind: "all" as const, ...o });
  it("REQ-046: la búsqueda filtra por título, resumen, ciudades y país (sin acentos, todas las palabras)", () => {
    expect(matchesToursFilter(mp, f({ search: "machu picchu" }))).toBe(true);
    expect(matchesToursFilter(mp, f({ search: "CUSCO" }))).toBe(true);
    expect(matchesToursFilter(mp, f({ search: "peru" }))).toBe(true);
    expect(matchesToursFilter(mp, f({ search: "aguas calientes tren" }))).toBe(true);
    expect(matchesToursFilter(mp, f({ search: "Paris" }))).toBe(false);
    expect(matchesToursFilter(mp, f({ search: "machu paris" }))).toBe(false);
    expect(matchesToursFilter(mp, f({ search: "   " }))).toBe(true);
  });
  it("REQ-046: el filtro de ciudad deja solo los viajes de esa ciudad", () => {
    expect(matchesToursFilter(mp, f({ cityName: "Cusco" }))).toBe(true);
    expect(matchesToursFilter(mp, f({ cityName: "Lima" }))).toBe(false);
  });
  it("REQ-046: el rango de precio también aplica", () => {
    expect(matchesToursFilter(mp, f({ minPrice: 500, maxPrice: 600 }))).toBe(true);
    expect(matchesToursFilter(mp, f({ maxPrice: 100 }))).toBe(false);
    expect(matchesToursFilter(mp, f({ minPrice: 1000 }))).toBe(false);
    expect(matchesToursFilter({ ...mp, priceFrom: null }, f({ minPrice: 1 }))).toBe(false);
  });
});

