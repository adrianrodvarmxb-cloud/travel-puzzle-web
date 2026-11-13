import { describe, it, expect } from "vitest";
import { parseCoords, firstPoint } from "./coords";

describe("coordenadas del punto de encuentro", () => {
  it("lee 'lat,lng'", () => {
    expect(parseCoords("45.761001,4.826655")).toEqual({ lat: 45.761001, lng: 4.826655 });
    expect(parseCoords(" 19.4326 , -99.1332 ")).toEqual({ lat: 19.4326, lng: -99.1332 });
  });
  it("corrige las que vienen invertidas (lng,lat)", () => {
    expect(parseCoords("120.98,14.59")).toEqual({ lat: 14.59, lng: 120.98 });
  });
  it("descarta vacías, inválidas o en 0,0", () => {
    for (const v of [null, undefined, "", "abc", "91,200", "0,0", "12", "12,"]) expect(parseCoords(v)).toBeNull();
  });
});

describe("REQ-3526: primer punto de encuentro válido de un viaje", () => {
  it("REQ-3526: toma el primer punto con lat y lng en rango", () => {
    expect(firstPoint([{ lat: null, lng: null }, { lat: 4.7016, lng: -74.1469 }, { lat: 10, lng: 10 }])).toEqual({ lat: 4.7016, lng: -74.1469 });
  });
  it("REQ-3526: descarta 0,0, fuera de rango, nulos y listas vacías o ausentes", () => {
    expect(firstPoint([{ lat: 0, lng: 0 }, { lat: 91, lng: 10 }, { lat: 10, lng: 181 }, { lat: null, lng: 5 }])).toBeNull();
    expect(firstPoint([])).toBeNull();
    expect(firstPoint(undefined)).toBeNull();
    expect(firstPoint(null)).toBeNull();
  });
});
