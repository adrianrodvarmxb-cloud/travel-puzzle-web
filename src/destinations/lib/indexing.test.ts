import { describe, it, expect } from "vitest";
import { cityMeetsRule, nextCityIndexState, cityHasPage, countryIndexable, wordCount, type CityIndexState } from "./indexing";

const guide = (words: number) => Array.from({ length: words }, (_, i) => `palabra${i}`).join(" ");
const day = (n: number) => new Date(Date.UTC(2026, 10, 1 + n, 9));

describe("REQ-089: regla de indexación de ciudad", () => {
  it("REQ-089: límites de 2/3/4 tours activos sin guía", () => {
    expect(cityMeetsRule({ activeTours: 2, guide: null })).toBe(false);
    expect(cityMeetsRule({ activeTours: 3, guide: null })).toBe(true);
    expect(cityMeetsRule({ activeTours: 4, guide: null })).toBe(true);
  });
  it("REQ-089: ciudad con 1 tour más guía propia de ≥300 palabras se indexa; con 299 no", () => {
    expect(cityMeetsRule({ activeTours: 1, guide: guide(300) })).toBe(true);
    expect(cityMeetsRule({ activeTours: 1, guide: guide(299) })).toBe(false);
  });
  it("REQ-089: la guía sola no basta: sin tours activos no se indexa", () => {
    expect(cityMeetsRule({ activeTours: 0, guide: guide(1000) })).toBe(false);
  });
  it("REQ-089: cuenta palabras ignorando espacios y saltos de línea", () => {
    expect(wordCount("  hola\n\nmundo   bonito ")).toBe(3);
    expect(wordCount("")).toBe(0);
    expect(wordCount(null)).toBe(0);
  });
});

describe("REQ-090: noindex solo tras 14 días seguidos sin cumplir", () => {
  const indexed: CityIndexState = { indexed: true, failingSince: null };

  it("REQ-090: ciudad que baja de 3 a 2 tours sigue indexada al día 13, pasa a noindex al 14 y sigue así al 15", () => {
    const meets3 = cityMeetsRule({ activeTours: 3, guide: null });
    let s = nextCityIndexState(null, meets3, day(0));
    expect(s).toEqual(indexed);
    const meets2 = cityMeetsRule({ activeTours: 2, guide: null });
    s = nextCityIndexState(s, meets2, day(1)); // empieza a fallar el día 1
    expect(s.indexed).toBe(true);
    expect(s.failingSince).toBe(day(1).toISOString());
    expect(nextCityIndexState(s, false, day(14)).indexed).toBe(true); // 13 días
    expect(nextCityIndexState(s, false, day(15)).indexed).toBe(false); // 14 días
    expect(nextCityIndexState(s, false, day(16)).indexed).toBe(false); // 15 días
  });
  it("REQ-090: vuelve a indexarse en cuanto cumple, y reinicia la cuenta", () => {
    const failing: CityIndexState = { indexed: false, failingSince: day(0).toISOString() };
    expect(nextCityIndexState(failing, true, day(30))).toEqual(indexed);
  });
  it("REQ-090: una caída que se recupera antes del día 14 no deja rastro", () => {
    let s = nextCityIndexState(indexed, false, day(0));
    s = nextCityIndexState(s, true, day(10));
    s = nextCityIndexState(s, false, day(11));
    expect(nextCityIndexState(s, false, day(24)).indexed).toBe(true); // 13 días desde el día 11
  });
  it("REQ-090: una ciudad nueva que nunca cumplió nace en noindex", () => {
    expect(nextCityIndexState(null, false, day(0)).indexed).toBe(false);
  });
  it("REQ-090: una ciudad en noindex no regresa sola mientras siga sin cumplir", () => {
    const off: CityIndexState = { indexed: false, failingSince: day(0).toISOString() };
    expect(nextCityIndexState(off, false, day(1))).toEqual(off);
  });
});

describe("REQ-091: país indexable y ciudad sin tours", () => {
  it("REQ-091: un país se indexa con ≥1 ciudad indexada", () => {
    expect(countryIndexable([{ indexed: false }, { indexed: true }])).toBe(true);
    expect(countryIndexable([{ indexed: false }])).toBe(false);
    expect(countryIndexable([])).toBe(false);
  });
  it("REQ-091: una ciudad sin tours activos no genera página (404); con 1 sí", () => {
    expect(cityHasPage(0)).toBe(false);
    expect(cityHasPage(1)).toBe(true);
  });
});
