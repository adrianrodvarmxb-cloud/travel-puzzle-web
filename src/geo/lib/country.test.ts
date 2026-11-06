import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseCountryOverrides, parseAnCities, mapCountry, mapCityCountry, parseCityCountryOverrides } from "./country";

const COUNTRY_CSV = `provider,provider_country_id,codigo_crudo,country_code,region_code,indexable,por_ciudad,nota
freetour,111,AN,,,si,si,Antillas Neerlandesas
freetour,177,SCT,GB,GB-SCT,si,no,Escocia
freetour,178,WLS,GB,GB-WLS,si,no,Gales
freetour,179,NIR,GB,GB-NIR,si,no,Irlanda del Norte
freetour,255,XX,,,no,no,sin país
`;

const AN_CSV = `provider,provider_city_id,nombre,country_code,estado,nota
freetour,,Willemstad,CW,revisar,propuesta
freetour,9001,Philipsburg,SX,aprobado,prueba
`;

const overrides = parseCountryOverrides(COUNTRY_CSV);

describe("mapCountry", () => {
  it("REQ-134: Escocia, Gales e Irlanda del Norte → GB con región", () => {
    expect(mapCountry({ id: 177, code: "SCT" }, overrides)).toEqual({ countryCode: "GB", regionCode: "GB-SCT", indexable: true, perCity: false, source: "override" });
    expect(mapCountry({ id: 178, code: "WLS" }, overrides)).toMatchObject({ countryCode: "GB", regionCode: "GB-WLS" });
    expect(mapCountry({ id: 179, code: "NIR" }, overrides)).toMatchObject({ countryCode: "GB", regionCode: "GB-NIR" });
  });

  it("REQ-134: XX (255) → sin país y sin página", () => {
    expect(mapCountry({ id: 255, code: "XX" }, overrides)).toMatchObject({ countryCode: null, indexable: false });
  });

  it("REQ-134: AN (111) → se decide por ciudad", () => {
    expect(mapCountry({ id: 111, code: "AN" }, overrides)).toMatchObject({ countryCode: null, perCity: true, indexable: true });
  });

  it("REQ-134: si el código crudo no coincide con el override, no se aplica y va a revisión", () => {
    expect(mapCountry({ id: 177, code: "GB" }, overrides)).toMatchObject({ source: "conflicto", countryCode: null, indexable: false });
  });

  it("REQ-134: los demás países usan su ISO-2", () => {
    expect(mapCountry({ id: 1, code: "MX" }, overrides)).toEqual({ countryCode: "MX", regionCode: null, indexable: true, perCity: false, source: "iso" });
    expect(mapCountry({ id: 2, code: "UK" }, overrides)).toMatchObject({ countryCode: "GB" });
    expect(mapCountry({ id: 3, code: "ZZZ" }, overrides)).toMatchObject({ countryCode: null, indexable: false, source: "pendiente" });
  });
});

describe("mapCityCountry (AN por ciudad)", () => {
  const an = parseAnCities(AN_CSV);
  const anCountry = mapCountry({ id: 111, code: "AN" }, overrides);

  it("REQ-134: solo aplica una fila aprobada con id de ciudad", () => {
    expect(mapCityCountry(9001, anCountry, an)).toMatchObject({ countryCode: "SX", indexable: true });
  });

  it("REQ-134: sin fila aprobada → sin país, no indexable, «AN: falta decidir»", () => {
    const r = mapCityCountry(9002, anCountry, an);
    expect(r).toMatchObject({ countryCode: null, indexable: false });
    expect(r.reason).toMatch(/AN/);
  });

  it("REQ-134: la propuesta sin id queda en revisión y no se aplica", () => {
    expect(an.find((r) => r.nombre === "Willemstad")).toMatchObject({ providerCityId: null, estado: "revisar" });
  });

  it("REQ-134: un país normal pasa igual", () => {
    expect(mapCityCountry(1, mapCountry({ id: 177, code: "SCT" }, overrides), an)).toMatchObject({ countryCode: "GB", regionCode: "GB-SCT" });
  });
});

describe("país por ciudad (Hong Kong → HK, Tórshavn → FO; PO, 6 nov 2026)", () => {
  const CSV = `provider,provider_city_id,codigo_crudo,country_code,nota,revisado_por
freetour,5835,CN,HK,Hong Kong,PO
freetour,6298,DK,FO,Tórshavn,PO
freetour,7,CN,hkg,código mal formado,PO
freetour,,CN,HK,sin id,PO
`;
  const rows = parseCityCountryOverrides(CSV);
  const cn = mapCountry({ id: 46, code: "CN" }, overrides);
  const dk = mapCountry({ id: 60, code: "DK" }, overrides);

  it("REQ-142: lee el CSV y descarta filas sin id o con código que no es ISO-2", () => {
    expect(rows.map((r) => r.providerCityId)).toEqual([5835, 6298]);
  });

  it("REQ-142: la ciudad toma su país ISO propio (HK, FO) con fuente «override»", () => {
    expect(mapCityCountry(5835, cn, [], "freetour", { rows, rawCode: "CN" })).toMatchObject({ countryCode: "HK", source: "override", indexable: true });
    expect(mapCityCountry(6298, dk, [], "freetour", { rows, rawCode: "DK" })).toMatchObject({ countryCode: "FO", source: "override" });
  });

  it("REQ-142: si el país crudo no coincide, no se aplica y la ciudad va a revisión (conflicto)", () => {
    expect(mapCityCountry(5835, dk, [], "freetour", { rows, rawCode: "DK" })).toMatchObject({ countryCode: null, indexable: false, source: "conflicto" });
  });

  it("REQ-142: las demás ciudades del país no cambian", () => {
    expect(mapCityCountry(1, cn, [], "freetour", { rows, rawCode: "CN" })).toMatchObject({ countryCode: "CN", source: "iso" });
  });

  it("REQ-142: el archivo real trae solo Hong Kong (HK) y Tórshavn (FO), firmados por el PO", () => {
    const real = parseCityCountryOverrides(readFileSync("src/geo/data/city-country-overrides.csv", "utf8"));
    expect(real.map((r) => [r.providerCityId, r.rawCode, r.countryCode])).toEqual([[5835, "CN", "HK"], [6298, "DK", "FO"]]);
  });
});
