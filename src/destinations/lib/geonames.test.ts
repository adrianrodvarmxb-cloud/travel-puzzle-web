import { describe, it, expect } from "vitest";
import { parseGeonamesLine, parseCoordinates, centroid, distanceKm, buildGeoIndex, matchCity, type GeoCity } from "./geonames";

// Formato de cities15000.txt (19 columnas separadas por tabulador).
const line = (id: number, name: string, alt: string, lat: number, lng: number, cc: string, admin1: string, pop: number) =>
  [id, name, name, alt, lat, lng, "P", "PPL", cc, "", admin1, "", "", "", pop, "", "", "America/Mexico_City", "2024-01-01"].join("\t");

const geo = (id: number, name: string, lat: number, lng: number, cc = "MX", admin1 = "03", alt = ""): GeoCity =>
  parseGeonamesLine(line(id, name, alt, lat, lng, cc, admin1, 50000))!;

describe("parseGeonamesLine", () => {
  it("REQ-085: lee id, nombres, coordenadas, país, estado y población", () => {
    const g = parseGeonamesLine(line(3530597, "Mexico City", "Ciudad de México,CDMX,Mexiko-Stadt", 19.43, -99.13, "MX", "09", 12294193));
    expect(g).toEqual({
      geonameid: 3530597, name: "Mexico City", lat: 19.43, lng: -99.13, countryCode: "MX", admin1: "09", population: 12294193,
      names: ["mexico-city", "ciudad-de-mexico", "cdmx", "mexiko-stadt"],
    });
  });

  it("REQ-085: línea vacía o rota → null", () => {
    expect(parseGeonamesLine("")).toBeNull();
    expect(parseGeonamesLine("x\ty")).toBeNull();
  });
});

describe("coordenadas y centroide", () => {
  it("REQ-085: lee «lat, lng» del punto de encuentro", () => {
    expect(parseCoordinates("19.4326, -99.1332")).toEqual({ lat: 19.4326, lng: -99.1332 });
    expect(parseCoordinates("x")).toBeNull();
    expect(parseCoordinates("0,0")).toBeNull(); // (0,0) es dato vacío, no un punto real
    expect(parseCoordinates("95,10")).toBeNull();
  });

  it("REQ-085: el centroide es la mediana (un punto mal capturado no lo mueve)", () => {
    const c = centroid([{ lat: 19.43, lng: -99.13 }, { lat: 19.44, lng: -99.14 }, { lat: 19.42, lng: -99.12 }, { lat: 40.4, lng: -3.7 }]);
    expect(c!.lat).toBeCloseTo(19.435, 2);
    expect(c!.lng).toBeCloseTo(-99.125, 3);
    expect(centroid([])).toBeNull();
  });

  it("REQ-085: distancia en km (CDMX–Puebla ≈ 110 km)", () => {
    expect(distanceKm({ lat: 19.4326, lng: -99.1332 }, { lat: 19.0414, lng: -98.2063 })).toBeGreaterThan(100);
    expect(distanceKm({ lat: 19.4326, lng: -99.1332 }, { lat: 19.0414, lng: -98.2063 })).toBeLessThan(120);
  });
});

describe("matchCity (gate 3: país + nombre + cercanía)", () => {
  const index = buildGeoIndex([
    geo(3985710, "San José del Cabo", 23.06, -109.69, "MX", "03"),
    geo(3984997, "San José del Cabo", 29.1, -110.95, "MX", "26"), // homónima ficticia en Sonora
    geo(3521081, "Puebla", 19.04, -98.2, "MX", "21", "Heroica Puebla de Zaragoza"),
    geo(3530597, "Mexico City", 19.43, -99.13, "MX", "09", "Ciudad de México"),
    geo(3936456, "Lima", -12.04, -77.03, "PE", "15"),
    geo(4002244, "La Paz", 24.14, -110.31, "MX", "03"),
  ]);

  it("REQ-085: nombre + país + cerca del centroide → automático", () => {
    const r = matchCity({ names: ["Ciudad de México", "Mexico City"], iso2: "MX", centroid: { lat: 19.43, lng: -99.14 } }, index);
    expect(r).toMatchObject({ status: "auto", geonameid: 3530597, admin1: "09" });
    expect(r.distanceKm).toBeLessThan(5);
  });

  it("REQ-085: homónimas en el país: gana la cercana al centroide", () => {
    const r = matchCity({ names: ["San José del Cabo"], iso2: "MX", centroid: { lat: 23.05, lng: -109.7 } }, index);
    expect(r).toMatchObject({ status: "auto", geonameid: 3985710, admin1: "03" });
  });

  it("REQ-085: mismo nombre en otro país no cuenta", () => {
    const r = matchCity({ names: ["Lima"], iso2: "MX", centroid: { lat: 19.4, lng: -99.1 } }, index);
    expect(r.status).not.toBe("auto");
  });

  it("REQ-085: el nombre coincide pero lejos del centroide → revisión", () => {
    const r = matchCity({ names: ["Puebla"], iso2: "MX", centroid: { lat: 21.0, lng: -101.0 } }, index);
    expect(r).toMatchObject({ status: "revisar", geonameid: 3521081 });
    expect(r.reason).toMatch(/km/);
  });

  it("REQ-085: sin coincidencia de nombre, la más cercana se propone para revisión", () => {
    const r = matchCity({ names: ["Barrio Antiguo"], iso2: "MX", centroid: { lat: 24.15, lng: -110.3 } }, index);
    expect(r).toMatchObject({ status: "revisar", geonameid: 4002244 });
  });

  it("REQ-085: sin centroide no hay cercanía → revisión aunque haya un solo nombre", () => {
    const r = matchCity({ names: ["Puebla"], iso2: "MX", centroid: null }, index);
    expect(r).toMatchObject({ status: "revisar", geonameid: 3521081 });
  });

  it("REQ-085: sin nada cerca ni por nombre → sin candidato (se queda ft:{id})", () => {
    expect(matchCity({ names: ["Nowhere"], iso2: "MX", centroid: { lat: 30, lng: -90 } }, index)).toMatchObject({ status: "sin-candidato", geonameid: null });
    expect(matchCity({ names: ["Lima"], iso2: null, centroid: null }, index)).toMatchObject({ status: "sin-candidato" });
  });
});
