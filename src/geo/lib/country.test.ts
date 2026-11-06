import { describe, it, expect } from "vitest";
import { parseCountryOverrides, parseAnCities, mapCountry, mapCityCountry } from "./country";

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
