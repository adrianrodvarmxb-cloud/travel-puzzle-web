import { describe, it, expect } from "vitest";
import { normalize, toEntry, queryCatalog, type CatalogEntry } from "./query";

const e = (id: string, o: Partial<CatalogEntry> = {}): CatalogEntry => ({
  id, cityId: 1, countryId: 1, categoryId: 1, price: 0, rating: null, reviews: 0, durationMinutes: null,
  createdAt: 0, updatedAt: 0, text: normalize(id), ...o,
});

describe("INC-003: catálogo en memoria (REQ-035)", () => {
  it("REQ-035: normaliza acentos y mayúsculas para buscar", () => {
    expect(normalize("  París ÁÉ ")).toBe("paris ae");
  });

  it("REQ-035: arma la entrada desde la fila de D1 (Decimal como texto, fechas ISO, nombres de ciudad/país)", () => {
    const x = toEntry({
      id: "t1", cityId: 5, countryId: 7, categoryId: 2, priceValue: "12.5", rating: "4.8", reviewsNumber: 30,
      durationMinutes: 120, createdAt: "2026-10-30T00:00:00.000+00:00", updatedAt: 1730246400000,
      title: "Free Tour Roma", brief: "Coliseo", cityTr: '{"es":"Roma","en":"Rome"}', countryTr: '{"es":"Italia"}',
    }, "es");
    expect(x).toMatchObject({ id: "t1", price: 12.5, rating: 4.8, reviews: 30, durationMinutes: 120 });
    expect(x.createdAt).toBe(Date.parse("2026-10-30T00:00:00.000Z"));
    expect(x.text).toContain("free tour roma");
    expect(x.text).toContain("italia");
    expect(x.text).toContain("rome");
  });

  it("REQ-035: filtra por país, ciudad, precio y duración, y cuenta el total", () => {
    const all = [
      e("a", { countryId: 1, cityId: 10, price: 0, durationMinutes: 60 }),
      e("b", { countryId: 1, cityId: 11, price: 30, durationMinutes: 200 }),
      e("c", { countryId: 2, cityId: 20, price: 50, durationMinutes: 90 }),
    ];
    expect(queryCatalog(all, { countryId: 1 }, {}).total).toBe(2);
    expect(queryCatalog(all, { cityId: 20 }, {}).ids).toEqual(["c"]);
    expect(queryCatalog(all, { minPrice: 20, maxPrice: 40 }, {}).ids).toEqual(["b"]);
    expect(queryCatalog(all, { durationRange: "short" }, {}).ids.sort()).toEqual(["a", "c"]);
  });

  it("REQ-035: busca todas las palabras (sin acentos) en título, resumen, ciudad o país", () => {
    const all = [e("a", { text: normalize("Free tour Roma Italia") }), e("b", { text: normalize("Tour París Francia") })];
    expect(queryCatalog(all, { search: "paris" }, {}).ids).toEqual(["b"]);
    expect(queryCatalog(all, { search: "TOUR roma" }, {}).ids).toEqual(["a"]);
    expect(queryCatalog(all, { search: "madrid" }, {}).total).toBe(0);
  });

  it("REQ-035: ordena como antes (reseñas desc por defecto; nulos al final) y pagina", () => {
    const all = [e("a", { reviews: 5, rating: null }), e("b", { reviews: 50, rating: 4.1 }), e("c", { reviews: 10, rating: 4.9 })];
    expect(queryCatalog(all, {}, { sortBy: "reviewsNumber", sortOrder: "desc" }).ids).toEqual(["b", "c", "a"]);
    expect(queryCatalog(all, {}, { sortBy: "rating", sortOrder: "desc" }).ids).toEqual(["c", "b", "a"]);
    const p = queryCatalog(all, {}, { sortBy: "reviewsNumber", sortOrder: "desc", page: 2, limit: 2 });
    expect(p).toEqual({ ids: ["a"], total: 3, page: 2, limit: 2 });
  });
});

describe("REQ-049 filtros de idioma del guía y fecha disponible", () => {
  const entries = [
    e("es", { languages: ["es"], dates: ["2026-11-10"] }),
    e("en", { languages: ["en", "es"], dates: ["2026-11-10", "2026-11-11"] }),
    e("sin", { languages: null, dates: null }), // sin dato vigente
  ];
  it("REQ-049: idioma deja solo los tours con salida en ese idioma; sin dato no se afirma", () => {
    expect(queryCatalog(entries, { guideLanguage: "en" }, {}).ids).toEqual(["en"]);
    expect(queryCatalog(entries, { guideLanguage: "es" }, {}).ids.sort()).toEqual(["en", "es"]);
  });
  it("REQ-049: fecha deja solo los tours con salida ese día", () => {
    expect(queryCatalog(entries, { date: "2026-11-11" }, {}).ids).toEqual(["en"]);
  });
  it("REQ-049: sin filtros, los tours sin dato siguen apareciendo", () => {
    expect(queryCatalog(entries, {}, {}).ids).toHaveLength(3);
  });
});

describe("REQ-049 toEntry lee el resumen solo si está vigente", () => {
  it("REQ-049: resumen reciente → idiomas y fechas; viejo o ausente → null", () => {
    const base = { id: "t", cityId: 1, countryId: 1, guideLanguages: '["es","en"]', departureDates: '["2026-11-10"]' };
    const now = new Date("2026-11-05T12:00:00Z");
    expect(toEntry({ ...base, departuresSyncedAt: "2026-11-05T01:00:00.000+00:00" }, "es", now)).toMatchObject({ languages: ["es", "en"], dates: ["2026-11-10"] });
    expect(toEntry({ ...base, departuresSyncedAt: "2026-10-01T01:00:00.000+00:00" }, "es", now)).toMatchObject({ languages: null, dates: null });
    expect(toEntry({ id: "t", cityId: 1, countryId: 1 }, "es", now)).toMatchObject({ languages: null, dates: null });
  });
});
