import { describe, it, expect } from "vitest";
import { planGeoV2, buildGeoV2Sql, buildGeoV2PendingSql, reviewCsvRows } from "./dry-run-v2";
import { buildIndex, parseCityLine } from "./geonames-v2";
import { parseCountryOverrides, parseAnCities, parseCityCountryOverrides } from "./country";
import { parseCityAliases } from "./alias";
import { parseCityOverrides } from "./resolve";

const line = (id: number, name: string, lat: number, lng: number, cc: string, pop = 10000) =>
  [id, name, name, "", lat, lng, "P", "PPL", cc, "", "01", "", "", "", pop, "", "", "X/Y", "2024-01-01"].join("\t");

const index = buildIndex(
  [
    line(2650225, "Edinburgh", 55.95, -3.19, "GB", 464990),
    line(1668341, "Taipei", 25.05, 121.53, "TW", 7871900),
    line(264371, "Athens", 37.98, 23.72, "GR", 664046),
    line(264637, "Delfoi", 38.48, 22.49, "GR", 1000),
    line(3, "Ioannina", 39.66, 20.85, "GR", 65000),
    line(1819729, "Hong Kong", 22.278, 114.175, "HK", 7396076),
  ].map((l) => parseCityLine(l)!),
  [{ geonameid: 264637, lang: "en", name: "Delphi" }],
);

const overrides = {
  countries: parseCountryOverrides("provider,provider_country_id,codigo_crudo,country_code,region_code,indexable,por_ciudad,nota\nfreetour,177,SCT,GB,GB-SCT,si,no,\nfreetour,255,XX,,,no,no,\n"),
  an: parseAnCities("provider,provider_city_id,nombre,country_code,estado,nota\n"),
  aliases: parseCityAliases("provider,provider_city_id,city_key,canonical_city_id,nota\nfreetour,4200,taipei,4200,\nfreetour,6172,taipei,4200,\n"),
  cities: parseCityOverrides("provider,provider_city_id,accion,geonameid,nota,revisado_por\n"),
  cityCountries: parseCityCountryOverrides("provider,provider_city_id,codigo_crudo,country_code,nota,revisado_por\nfreetour,5835,CN,HK,Hong Kong,PO\n"),
};

const tr = (en: string, es = en) => JSON.stringify({ en, es });
const ATHENS = "37.98417,23.72778";

const plan = planGeoV2({
  countries: [{ id: 177, code: "SCT" }, { id: 152, code: "TW" }, { id: 80, code: "GR" }, { id: 255, code: "XX" }, { id: 46, code: "CN" }],
  cities: [
    { id: 4842, countryId: 177, translations: tr("Edinburgh", "Edimburgo") },
    { id: 4200, countryId: 152, translations: tr("Taipei") },
    { id: 6172, countryId: 152, translations: tr("Taipei City", "Taipéi") },
    { id: 1600, countryId: 80, translations: tr("Athens", "Atenas"), geonameid: 264371 },
    { id: 1606, countryId: 80, translations: tr("Delphi") },
    { id: 1700, countryId: 80, translations: tr("Ioannina"), geonameid: 999 }, // control: el aproximado dirá 3
    { id: 2550, countryId: 255, translations: tr("Nowhere") },
    { id: 5835, countryId: 46, translations: tr("Hong Kong") },
  ],
  tours: [
    { cityId: 4842, coords: "55.95,-3.19" },
    { cityId: 4200, coords: "25.05,121.53" },
    { cityId: 6172, coords: "25.05,121.53" },
    { cityId: 1600, coords: ATHENS },
    { cityId: 1606, coords: ATHENS },
    { cityId: 1700, coords: "39.66,20.85" },
    { cityId: 5835, coords: "22.28,114.17" },
  ],
  index,
  overrides,
});
const row = (id: number) => plan.rows.find((r) => r.cityId === id)!;

describe("planGeoV2", () => {
  it("REQ-134: Edimburgo (SCT) se cruza contra GB y lleva región GB-SCT", () => {
    expect(row(4842)).toMatchObject({ countryCode: "GB", regionCode: "GB-SCT", status: "auto", geonameid: 2650225 });
  });

  it("REQ-135: Taipei 4200 y 6172 se resuelven juntas en la canónica «taipei»", () => {
    expect(row(4200)).toMatchObject({ cityKey: "taipei", canonicalCityId: 4200, geonameid: 1668341 });
    expect(row(6172)).toMatchObject({ cityKey: "taipei", canonicalCityId: 4200, geonameid: 1668341 });
  });

  it("REQ-132/133: Delphi con centroide en Atenas → centroide no confiable y nombre exacto único", () => {
    expect(row(1606)).toMatchObject({ centroidReliable: false, status: "auto", geonameid: 264637 });
  });

  it("REQ-133: control: un geonameid guardado no se mueve; si el aproximado difiere, se reporta", () => {
    expect(row(1700)).toMatchObject({ geonameid: 999, source: "id", controlDiff: true });
    expect(plan.summary.control).toMatchObject({ conGeonameid: 2, difieren: 1 });
  });

  it("REQ-134: XX → sin página, fuera del conteo de cruce", () => {
    expect(row(2550)).toMatchObject({ status: "sin-pagina", countryCode: null });
  });

  it("REQ-137: resumen con automáticas antes/después, revisar y sin candidato", () => {
    expect(plan.summary).toMatchObject({ ciudades: 8, sinPagina: 1 });
    expect(plan.summary.despues.auto).toBe(plan.rows.filter((r) => r.status === "auto").length);
  });

  it("REQ-137: el SQL solo llena geonameid vacíos; nada para las de control ni sin página", () => {
    const sql = buildGeoV2Sql(plan);
    expect(sql).toContain(`UPDATE "City" SET "geonameid" = 2650225 WHERE "id" = 4842 AND "geonameid" IS NULL;`);
    expect(sql).not.toMatch(/"id" = (1600|1700|2550)\b/);
    expect(sql).not.toMatch(/DELETE|DROP|INSERT/);
  });

  it("REQ-134/135: el SQL que depende de la 0016 va aparte e idempotente", () => {
    const sql = buildGeoV2PendingSql(plan);
    expect(sql).toMatch(/0016/);
    expect(sql).toContain(`UPDATE "City" SET "regionCode" = 'GB-SCT' WHERE "id" = 4842 AND "regionCode" IS NULL;`);
    expect(sql).toContain(`INSERT OR IGNORE INTO "CityAlias" ("provider", "providerCityId", "cityId") VALUES ('freetour', 6172, 4200);`);
  });

  it("REQ-137: CSV de revisión con top-3 (geonameid, nombre, km, población)", () => {
    const r = reviewCsvRows([{ ...row(1606), status: "revisar" }])[0];
    expect(r).toHaveProperty("c1_geonameid");
    expect(r).toHaveProperty("c1_km");
    expect(r).toHaveProperty("c1_poblacion");
    expect(r).toHaveProperty("c3_geonameid");
  });

  it("REQ-142: Hong Kong (FREETOUR CN) se cruza contra HK y el SQL de la 0016 le pone countryCode HK", () => {
    expect(row(5835)).toMatchObject({ countryCode: "HK", countrySource: "override", status: "auto", geonameid: 1819729 });
    expect(buildGeoV2PendingSql(plan)).toContain(`UPDATE "City" SET "countryCode" = 'HK' WHERE "id" = 5835 AND "countryCode" IS NULL;`);
  });
});
