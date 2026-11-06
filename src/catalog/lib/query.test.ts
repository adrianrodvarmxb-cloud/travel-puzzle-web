import { describe, it, expect } from "vitest";
import { normalize, toEntry, queryCatalog, splitDestination, CATALOG_SHAPE, type CatalogEntry } from "./query";

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

describe("REQ-051/052/053/054/055 filtros de Freetour en el catálogo", () => {
  const nowMs = Date.parse("2026-12-15T00:00:00Z");
  const entries = [
    e("pie", { categoryId: 12, durationMinutes: 120, createdAt: Date.parse("2026-10-30T00:00:00Z") }),
    e("barco", { categoryId: 3, durationMinutes: 300, createdAt: Date.parse("2026-12-10T00:00:00Z") }),
  ];
  const q = (f: object) => queryCatalog(entries, f, {}, nowMs).ids.sort();
  it("REQ-051: tipo de actividad por grupo", () => {
    expect(q({ groups: ["barcos"] })).toEqual(["barco"]);
    expect(q({ groups: ["barcos", "visitas"] })).toEqual(["barco", "pie"]);
  });
  it("REQ-052: cancelación gratuita — todos los de Freetour la tienen (24 h)", () => {
    expect(q({ freeCancel: true })).toEqual(["barco", "pie"]);
  });
  it("REQ-053/054: privado y recogida en hotel — Freetour no lo informa, así que no se afirma", () => {
    expect(q({ privateOnly: true })).toEqual([]);
    expect(q({ hotelPickup: true })).toEqual([]);
  });
  it("REQ-055: novedad = alta en los últimos 30 días y después de la carga inicial del catálogo", () => {
    expect(q({ novelty: true })).toEqual(["barco"]);
  });
  it("REQ-056: duración por rango en minutos", () => {
    expect(q({ durMin: 60, durMax: 180 })).toEqual(["pie"]);
    expect(q({ durMin: 200 })).toEqual(["barco"]);
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

// REQ-057 (INC-005): "Roma" traía Bucarest (Romania), León ("Jardín Romántico", "murallas romanas"), Nápoles ("romano")…
describe("REQ-057 búsqueda por destino y por palabra completa", () => {
  const entries = [
    e("roma1", { text: normalize("Free Tour Roma Esencial Roma Rome Italia Italy"), cityNames: ["roma", "rome"], countryNames: ["italia", "italy"], reviews: 10 }),
    e("roma2", { text: normalize("Trastevere Roma Rome Italia"), cityNames: ["roma", "rome"], countryNames: ["italia", "italy"], reviews: 5 }),
    e("bucarest", { text: normalize("Free Tour Bucarest Bucharest Rumania Romania"), cityNames: ["bucarest", "bucharest"], countryNames: ["rumania", "romania"] }),
    e("leon", { text: normalize("Centro de León Jardín Romántico murallas romanas León España"), cityNames: ["leon"], countryNames: ["espana", "spain"] }),
    e("napoles", { text: normalize("Nápoles casco antiguo greco-romano Napoli Italia"), cityNames: ["napoles", "naples"], countryNames: ["italia", "italy"] }),
  ];
  const ids = (search: string) => queryCatalog(entries, { search }, {}).ids.sort();
  it("REQ-057: si el texto es un destino (ciudad en cualquier idioma) solo salen tours de ese destino", () => {
    expect(ids("Roma")).toEqual(["roma1", "roma2"]);
    expect(ids("rome")).toEqual(["roma1", "roma2"]);
    expect(ids("  ROMA ")).toEqual(["roma1", "roma2"]);
  });
  it("REQ-057: un país también es destino", () => {
    expect(ids("Rumania")).toEqual(["bucarest"]);
    expect(ids("italia")).toEqual(["napoles", "roma1", "roma2"]);
  });
  it("REQ-057: fuera de destinos, la palabra completa gana a los pedazos (romano no es Roma)", () => {
    expect(ids("murallas")).toEqual(["leon"]);
    expect(ids("casco antiguo")).toEqual(["napoles"]);
  });
  it("REQ-057: si nadie tiene la palabra completa, se acepta el inicio de palabra (se está escribiendo)", () => {
    expect(ids("trasteve")).toEqual(["roma2"]);
  });
});

// REQ-058 (INC-005): el catálogo en caché tenía la forma vieja (sin cityNames) y la búsqueda por destino no se activaba.
describe("REQ-058 la llave de caché del catálogo cambia sola cuando cambia la forma de las entradas", () => {
  it("REQ-058: la firma incluye todos los campos de toEntry", () => {
    const keys = Object.keys(toEntry({ id: "x", cityId: 1, countryId: 1 }, "es")).sort().join(",");
    expect(CATALOG_SHAPE).toBe(keys);
    expect(CATALOG_SHAPE).toContain("cityNames");
  });
});

describe("REQ-048 + REQ-057 relevancia FTS respeta la intención de destino", () => {
  it("REQ-057: con ids de FTS que incluyen 'romano', buscar 'Roma' deja solo tours de Roma", () => {
    const entries = [
      e("roma", { text: "free tour roma", cityNames: ["roma", "rome"] }),
      e("leon", { text: "murallas romanas leon", cityNames: ["leon"] }),
    ];
    expect(queryCatalog(entries, { search: "Roma", ranked: ["leon", "roma"] }, {}).ids).toEqual(["roma"]);
    expect(queryCatalog(entries, { search: "murallas", ranked: ["leon"] }, {}).ids).toEqual(["leon"]);
  });
});

// REQ-122 (gates búsqueda 5 nov 2026, Gate 1 = A): una palabra o par de palabras que es destino filtra a ese destino.
describe("REQ-122 destino dentro del texto (como GetYourGuide/Civitatis)", () => {
  const it_ = { countryNames: ["italia", "italy"] };
  const entries = [
    e("roma1", { text: "free tour por roma", cityNames: ["roma", "rome", "rom"], ...it_, reviews: 9 }),
    e("roma2", { text: "visita guiada al coliseo", cityNames: ["roma", "rome", "rom"], ...it_, reviews: 5 }),
    e("buc", { text: "free tour por bucarest", cityNames: ["bucarest", "bucharest"], countryNames: ["rumania", "romania"], reviews: 8 }),
    e("leon", { text: "tour del jardin romantico de leon", cityNames: ["leon"], countryNames: ["mexico"], reviews: 2 }),
    e("ny", { text: "free tour manhattan", cityNames: ["nueva york", "new york"], countryNames: ["estados unidos", "united states"] }),
    e("flo", { text: "free tour florencia de roma a los medici", cityNames: ["florencia", "florence"], ...it_, reviews: 1 }),
  ];
  it("REQ-122: separa el destino (ciudad primero, luego país) y deja el resto del texto", () => {
    expect(splitDestination(entries, "Roma tour")).toMatchObject({ kind: "city", name: "roma", rest: "tour" });
    expect(splitDestination(entries, "free tour Roma")).toMatchObject({ name: "roma", rest: "free tour" });
    expect(splitDestination(entries, "tours en Roma")).toMatchObject({ name: "roma", rest: "tours en" });
    expect(splitDestination(entries, "Rome")).toMatchObject({ name: "rome", rest: "" });
    expect(splitDestination(entries, "tour Italia")).toMatchObject({ kind: "country", name: "italia", rest: "tour" });
  });
  it("REQ-122: un par de palabras también es destino (Nueva York) y gana a una sola palabra", () => {
    expect(splitDestination(entries, "free tour nueva york")).toMatchObject({ name: "nueva york", rest: "free tour" });
  });
  it("REQ-122: sin destino en el texto no hay separación (\"arte\", \"romantico\")", () => {
    expect(splitDestination(entries, "arte")).toBeNull();
    expect(splitDestination(entries, "romantico")).toBeNull();
    expect(splitDestination(entries, "")).toBeNull();
  });
  const v2 = (search: string, ranked: string[] | null) => queryCatalog(entries, { search, ranked, searchV2: true }, {}).ids;
  it("REQ-122: con la búsqueda nueva solo salen tours del destino, en el orden de relevancia del resto", () => {
    // FTS (resto "tour" dentro de Roma) puede traer ids de otros lados: se descartan
    expect(v2("Roma tour", ["buc", "roma1", "leon", "flo"])).toEqual(["roma1"]);
    expect(v2("free tour Roma", ["flo", "roma1", "buc"])).toEqual(["roma1"]);
  });
  it("REQ-122: si el resto no encuentra nada dentro del destino, salen todos los tours del destino", () => {
    expect(v2("Roma", null)).toEqual(["roma1", "roma2"]);
    expect(v2("tours en Roma", ["buc"])).toEqual(["roma1", "roma2"]);
  });
  it("REQ-122: sin destino se usa la relevancia de FTS como antes", () => {
    expect(v2("arte", ["flo", "roma2"])).toEqual(["flo", "roma2"]);
  });
  it("REQ-122: con la bandera APAGADA (searchV2 ausente) el resultado es el de siempre", () => {
    const off = (search: string) => queryCatalog(entries, { search, ranked: null }, {}).ids;
    expect(off("Roma")).toEqual(["roma1", "roma2"]);
    expect(off("Roma tour")).toEqual(["flo", "roma1"]); // comportamiento previo (REQ-057), sin cambios
    expect(off("tours en Roma")).toEqual([]);
  });
});
