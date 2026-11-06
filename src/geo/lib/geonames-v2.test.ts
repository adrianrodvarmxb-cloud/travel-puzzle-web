import { describe, it, expect } from "vitest";
import { parseCityLine, parseAltNameLine, buildIndex, findCandidates, nearestInCountryKm, type GeoPlace } from "./geonames-v2";

// Formato «geoname» de GeoNames (19 columnas, tabulador).
const line = (id: number, name: string, alt: string, lat: number, lng: number, cc: string, pop = 1000, fcode = "PPL", admin1 = "01") =>
  [id, name, name, alt, lat, lng, "P", fcode, cc, "", admin1, "", "", "", pop, "", "", "Europe/X", "2024-01-01"].join("\t");
// alternateNamesV2: id, geonameid, idioma, nombre, preferido, corto, coloquial, histórico, desde, hasta.
const alt = (gid: number, lang: string, name: string, flags: [string, string, string, string] = ["", "", "", ""]) => [1, gid, lang, name, ...flags, "", ""].join("\t");

describe("parseCityLine", () => {
  it("REQ-128: lee cities500 (id, nombre, país, estado, población, coordenadas, tipo)", () => {
    expect(parseCityLine(line(2775220, "Hallstatt", "Halstat", 47.56, 13.65, "AT", 750))).toEqual({
      geonameid: 2775220, name: "Hallstatt", lat: 47.56, lng: 13.65, countryCode: "AT", admin1: "01", population: 750, featureCode: "PPL", names: ["Hallstatt", "Halstat"], strong: ["Hallstatt"],
    });
    expect(parseCityLine("roto")).toBeNull();
  });

  it("REQ-128: descarta nombres en chino (la llave es latina)", () => {
    expect(parseCityLine(line(1, "Harbin", "Harbin,哈尔滨", 45.75, 126.65, "CN"))!.names).toEqual(["Harbin"]);
  });
});

describe("parseAltNameLine", () => {
  it("REQ-128: solo es/en y el puente wkdt; sin históricos ni coloquiales", () => {
    expect(parseAltNameLine(alt(264670, "es", "Nauplia"))).toEqual({ geonameid: 264670, lang: "es", name: "Nauplia" });
    expect(parseAltNameLine(alt(264670, "wkdt", "Q183084"))).toEqual({ geonameid: 264670, lang: "wkdt", name: "Q183084" });
    expect(parseAltNameLine(alt(264670, "de", "Nafplio"))).toBeNull();
    expect(parseAltNameLine(alt(264670, "es", "Nauplion", ["", "", "", "1"]))).toBeNull(); // histórico
    expect(parseAltNameLine(alt(264670, "en", "Naffy", ["", "", "1", ""]))).toBeNull(); // coloquial
  });
});

describe("índice y candidatos", () => {
  const places: GeoPlace[] = [
    parseCityLine(line(264670, "Náfplio", "", 37.5673, 22.8015, "GR", 14000))!,
    parseCityLine(line(264371, "Athens", "Athina", 37.98376, 23.72784, "GR", 664046))!,
    parseCityLine(line(3, "Side", "", 36.767, 31.389, "TR", 14000))!,
    parseCityLine(line(4, "Side", "", 40.9, 37.9, "TR", 90000))!,
    parseCityLine(line(5, "Guatapé", "", 6.2325, -75.158, "CO", 5000))!,
    parseCityLine(line(6, "Saint Julian's", "", 35.918, 14.489, "MT", 13000))!,
  ];
  const index = buildIndex(places, [{ geonameid: 264670, lang: "es", name: "Nauplia" }, { geonameid: 264670, lang: "wkdt", name: "Q183084" }]);

  it("REQ-128: un nombre de alternateNames (es) es coincidencia exacta", () => {
    const c = findCandidates(index, { iso2: "GR", names: ["Nauplia"], centroid: { lat: 37.57, lng: 22.8 } });
    expect(c[0]).toMatchObject({ geonameid: 264670, match: "exact", nameScore: 1, strong: true });
    expect(index.wikidata.get(264670)).toBe("Q183084");
  });

  it("REQ-124/128: un alternatename suelto es exacto pero no «fuerte»", () => {
    const p = parseCityLine(line(9, "La Palma del Condado", "La Palma", 37.38, -6.55, "ES"))!;
    const c = findCandidates(buildIndex([p]), { iso2: "ES", names: ["La Palma"], centroid: null });
    expect(c[0]).toMatchObject({ match: "exact", strong: false });
  });

  it("REQ-128: devuelve todos los homónimos con su distancia", () => {
    const c = findCandidates(index, { iso2: "TR", names: ["Side"], centroid: { lat: 36.77, lng: 31.39 } });
    expect(c.map((x) => x.geonameid).sort()).toEqual([3, 4]);
    expect(c.find((x) => x.geonameid === 3)!.distanceKm).toBeLessThan(1);
  });

  it("REQ-122/128: variante San/Saint", () => {
    const c = findCandidates(index, { iso2: "MT", names: ["San Julián"], centroid: { lat: 35.92, lng: 14.49 } });
    expect(c[0]).toMatchObject({ geonameid: 6, match: "variant" });
  });

  it("REQ-128: fuzzy con ciudades a ≤ 15 km del mismo país", () => {
    const c = findCandidates(index, { iso2: "CO", names: ["Guatape "], centroid: { lat: 6.23, lng: -75.16 } });
    expect(c[0]).toMatchObject({ geonameid: 5 }); // exacta tras normalizar
    const f = findCandidates(index, { iso2: "CO", names: ["Guatepe"], centroid: { lat: 6.23, lng: -75.16 } });
    expect(f[0]).toMatchObject({ geonameid: 5, match: "fuzzy" });
  });

  it("REQ-128: sin nombre, la más cercana entra solo como «nearest»", () => {
    const c = findCandidates(index, { iso2: "GR", names: ["Delphi"], centroid: { lat: 37.984, lng: 23.728 } });
    expect(c[0]).toMatchObject({ geonameid: 264371, match: "nearest", nameScore: 0 });
  });

  it("REQ-123: distancia a la ciudad más cercana del país", () => {
    expect(nearestInCountryKm(index, "GR", { lat: 37.984, lng: 23.728 })).toBeLessThan(1);
    expect(nearestInCountryKm(index, "GR", { lat: 48.65, lng: 63.3 })).toBeGreaterThan(1000);
    expect(nearestInCountryKm(index, "ZZ", { lat: 0, lng: 0 })).toBe(Infinity);
  });
});
