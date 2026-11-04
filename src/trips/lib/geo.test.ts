import { describe, it, expect } from "vitest";
import { continentOf, regionOf, isCountryCode, CONTINENT_LABEL } from "./geo";
import { cardPlaces } from "./geo";

describe("geo", () => {
  it("continente por código ISO", () => {
    expect(continentOf("MX")).toBe("LAT");
    expect(continentOf("US")).toBe("NAM");
    expect(continentOf("JP")).toBe("ASI");
    expect(continentOf("ES")).toBe("EUR");
    expect(continentOf("AU")).toBe("OCE");
    expect(continentOf("EG")).toBe("AFR");
    expect(continentOf("ZZ")).toBeNull();
  });
  it("región del viaje: un país, su código; varios del mismo continente, el continente; si no, MUL", () => {
    expect(regionOf(["IS"])).toBe("IS");
    expect(regionOf(["AR", "CL"])).toBe("LAT");
    expect(regionOf(["IS", "JP"])).toBe("MUL");
  });
  it("valida códigos y tiene etiquetas en español", () => {
    expect(isCountryCode("CO")).toBe(true);
    expect(isCountryCode("co")).toBe(false);
    expect(CONTINENT_LABEL.LAT).toBe("Latinoamérica");
  });
});

describe("cardPlaces", () => {
  it("REQ-004: une hasta 3 países traducidos en el servidor", () => {
    expect(cardPlaces(["FR", "IT", "ES", "DE"], "es")).toBe("Francia · Italia · España");
    expect(cardPlaces([], "es")).toBe("");
  });
});
