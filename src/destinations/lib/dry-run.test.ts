import { describe, it, expect } from "vitest";
import { planIdentity, buildIdentitySql, findDuplicates, toCsv, buildGeonameSql, cityName } from "./dry-run";

const countries = [
  { id: 99, code: "MX", iso2: null },
  { id: 61, code: "FR", iso2: null },
  { id: 62, code: "FR-62", iso2: null }, // dos filas que darían el mismo ISO-2
  { id: 7, code: "C7", iso2: null },
];
const cities = [
  { id: 1, countryId: 99, translations: JSON.stringify({ en: "Mexico City", es: "Ciudad de México" }), slug: null, stateCode: null },
  { id: 2, countryId: 99, translations: { en: "Leon", es: "León" }, slug: null, stateCode: null },
  { id: 3, countryId: 99, translations: { es: "León" }, slug: null, stateCode: "GTO" },
  { id: 4, countryId: 61, translations: { en: "Paris" }, slug: "paris", stateCode: null },
];
const tours = [
  { id: "u1", externalId: 10, providerId: "freetour", cityId: 1, countryId: 99, titleEs: "Free Tour Centro Histórico", titleEn: "Historic Center", slug: null },
  { id: "u2", externalId: 11, providerId: "freetour", cityId: 1, countryId: 99, titleEs: "Free Tour Centro Histórico", titleEn: null, slug: null },
  { id: "u3", externalId: 12, providerId: "freetour", cityId: 4, countryId: 61, titleEs: null, titleEn: "Paris Walk", slug: "paseo-paris" },
];

describe("planIdentity", () => {
  const plan = planIdentity({ countries, cities, tours });

  it("REQ-085: ISO-2 por país; los que chocan o no son ISO quedan para revisión", () => {
    expect(plan.countries).toEqual([
      { id: 99, iso2: "MX", source: "new" },
      { id: 61, iso2: null, source: "pending", reason: "FR repetido en 2 países" },
      { id: 62, iso2: null, source: "pending", reason: "FR repetido en 2 países" },
      { id: 7, iso2: null, source: "pending", reason: "código no es ISO-2" },
    ]);
  });

  it("REQ-086: slugs de tours sin duplicados; el guardado se conserva", () => {
    expect(plan.tours.map((t) => [t.id, t.slug, t.source])).toEqual([
      ["u1", "free-tour-centro-historico", "new"],
      ["u2", "free-tour-centro-historico-2", "new"],
      ["u3", "paseo-paris", "kept"],
    ]);
    expect(plan.report.tourDuplicates).toEqual([]);
    expect(plan.report.tours).toEqual({ total: 3, kept: 1, new: 2, fallback: 0, pending: 0, withSuffix: 1 });
  });

  it("REQ-087: ciudades con el nombre en español y homónimas con estado", () => {
    expect(plan.cities.map((c) => [c.id, c.slug, c.source])).toEqual([
      [1, "ciudad-de-mexico", "new"],
      [2, null, "pending"],
      [3, "leon-gto", "new"],
      [4, "paris", "kept"],
    ]);
    expect(plan.report.cityPending).toEqual([{ id: 2, countryId: 99, name: "León", reason: "homónima sin código de estado" }]);
  });
});

describe("buildIdentitySql", () => {
  it("REQ-086: solo llena lo vacío (WHERE … IS NULL) y nunca toca un slug guardado", () => {
    const sql = buildIdentitySql(planIdentity({ countries, cities, tours }));
    expect(sql).toContain(`UPDATE "Country" SET "iso2" = 'MX' WHERE "id" = 99 AND "iso2" IS NULL;`);
    expect(sql).toContain(`UPDATE "City" SET "slug" = 'leon-gto' WHERE "id" = 3 AND "slug" IS NULL;`);
    expect(sql).toContain(`UPDATE "Tour" SET "slug" = 'free-tour-centro-historico-2' WHERE "id" = 'u2' AND "slug" IS NULL;`);
    expect(sql).not.toContain("paseo-paris");
    expect(sql).not.toContain(`"id" = 2 AND`);
    expect(sql).not.toMatch(/DELETE|DROP|INSERT/);
  });
});

describe("utilidades", () => {
  it("REQ-086: findDuplicates detecta slugs repetidos", () => {
    expect(findDuplicates([{ id: "a", slug: "x" }, { id: "b", slug: "x" }, { id: "c", slug: "y" }, { id: "d", slug: null }])).toEqual([{ slug: "x", ids: ["a", "b"] }]);
  });

  it("REQ-087: cityName usa español, luego inglés, luego cualquiera", () => {
    expect(cityName({ en: "Rome", es: "Roma" })).toBe("Roma");
    expect(cityName('{"en":"Rome"}')).toBe("Rome");
    expect(cityName({ it: "Roma" })).toBe("Roma");
    expect(cityName(null)).toBe("");
  });

  it("REQ-085: CSV con comillas cuando hace falta", () => {
    expect(toCsv([{ a: 1, b: 'dice "hola", sí' }])).toBe('a,b\n1,"dice ""hola"", sí"\n');
  });

  it("REQ-085: SQL de geonameid solo para los automáticos y solo si está vacío", () => {
    const sql = buildGeonameSql([
      { cityId: 1, status: "auto", geonameid: 3530597 },
      { cityId: 2, status: "revisar", geonameid: 3521081 },
    ]);
    expect(sql).toBe(`UPDATE "City" SET "geonameid" = 3530597 WHERE "id" = 1 AND "geonameid" IS NULL;\n`);
  });
});
