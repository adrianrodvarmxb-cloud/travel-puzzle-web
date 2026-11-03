import { describe, it, expect } from "vitest";
import { parseCoords } from "./coords";

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
