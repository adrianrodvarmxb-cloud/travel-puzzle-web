import { describe, it, expect } from "vitest";
import { iso2FromCountry, naturalKey, cityCode, resolveTourUid, DEFAULT_PROVIDER } from "./ids";

describe("iso2FromCountry", () => {
  it("REQ-085: toma el ISO-2 de shortTitle o de Country.code, en mayúsculas", () => {
    expect(iso2FromCountry({ code: "MX" })).toBe("MX");
    expect(iso2FromCountry({ code: "XX", shortTitle: "pe" })).toBe("PE");
    expect(iso2FromCountry({ code: "cn" })).toBe("CN");
  });

  it("REQ-085: quita el sufijo «-id» que se agrega cuando el código choca", () => {
    expect(iso2FromCountry({ code: "FR-61" })).toBe("FR");
  });

  it("REQ-085: corrige alias que no son ISO (UK → GB, EL → GR)", () => {
    expect(iso2FromCountry({ code: "UK" })).toBe("GB");
    expect(iso2FromCountry({ code: "EL" })).toBe("GR");
  });

  it("REQ-085: país provisional o código que no es ISO → null (va a revisión)", () => {
    expect(iso2FromCountry({ code: "C123" })).toBeNull();
    expect(iso2FromCountry({ code: "ZZ" })).toBeNull();
    expect(iso2FromCountry({ code: "" })).toBeNull();
  });
});

describe("naturalKey y resolveTourUid", () => {
  it("REQ-085: la llave natural es (provider_id, external_id) como texto", () => {
    expect(naturalKey("freetour", 1234)).toBe("freetour:1234");
    expect(naturalKey("incaworld", "AB-9")).toBe("incaworld:AB-9");
    expect(DEFAULT_PROVIDER).toBe("freetour");
  });

  it("REQ-085: un tour que reaparece conserva su tour_uid; uno nuevo no tiene (lo crea la base)", () => {
    const existing = [{ id: "cuid_a", providerId: "freetour", externalId: 10 }];
    expect(resolveTourUid(existing, "freetour", 10)).toBe("cuid_a");
    expect(resolveTourUid(existing, "freetour", 11)).toBeNull();
    expect(resolveTourUid(existing, "incaworld", 10)).toBeNull();
  });
});

describe("cityCode", () => {
  it("REQ-085: geonameid si lo hay; si no, ft:{id de FREETOUR} hasta la revisión", () => {
    expect(cityCode({ id: 55, geonameid: 3530597 })).toBe("3530597");
    expect(cityCode({ id: 55, geonameid: null })).toBe("ft:55");
  });
});
