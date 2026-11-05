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

describe("REQ-048 queryCatalog con relevancia de FTS5", () => {
  const entries = [e("a", { text: "free tour lima", reviews: 900 }), e("b", { text: "machu picchu", reviews: 5 }), e("c", { text: "cusco machu picchu", reviews: 50 })];
  it("REQ-048: con ids ordenados por relevancia, filtra a esos y respeta su orden si no hay otro orden elegido", () => {
    const r = queryCatalog(entries, { search: "machu", ranked: ["c", "b"] }, { page: 1, limit: 20 });
    expect(r.ids).toEqual(["c", "b"]);
    expect(r.total).toBe(2);
  });
  it("REQ-048: si el visitante elige un orden (reseñas), se aplica sobre los encontrados", () => {
    const r = queryCatalog(entries, { search: "machu", ranked: ["b", "c"] }, { page: 1, limit: 20, sortBy: "reviewsNumber", sortOrder: "desc" });
    expect(r.ids).toEqual(["c", "b"]);
  });
  it("REQ-048: sin ranked (bandera apagada o FTS caído) se usa la búsqueda de siempre", () => {
    const r = queryCatalog(entries, { search: "picchu" }, { page: 1, limit: 20 });
    expect(r.ids.sort()).toEqual(["b", "c"]);
  });
});

describe("REQ-048 orden 'relevance'", () => {
  const entries = [e("a", { text: "machu x", reviews: 900 }), e("b", { text: "machu y", reviews: 5 })];
  it("REQ-048: relevance con ids de FTS respeta su orden; sin FTS cae a más reseñas", () => {
    expect(queryCatalog(entries, { search: "machu", ranked: ["b", "a"] }, { sortBy: "relevance", sortOrder: "desc" }).ids).toEqual(["b", "a"]);
    expect(queryCatalog(entries, { search: "machu" }, { sortBy: "relevance", sortOrder: "desc" }).ids).toEqual(["a", "b"]);
  });
});
