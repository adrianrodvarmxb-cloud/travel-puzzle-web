import { describe, expect, it } from "vitest";
import { normPlace, pickByPlace } from "./match";

const bus = (id: string, cities: string[], countries: string[]) => ({ id, cities, countries });
const items = [bus("par", ["París"], ["FR"]), bus("lon", ["Londres"], ["GB"]), bus("edi", ["Edimburgo"], ["GB"]), bus("nyc", ["Nueva York"], ["US"])];

describe("normPlace", () => {
  it("REQ-005: ignora acentos, mayúsculas y espacios", () => {
    expect(normPlace("  París ")).toBe("paris");
    expect(normPlace("PARIS")).toBe("paris");
  });
});

describe("pickByPlace", () => {
  it("REQ-005: primero lo de la misma ciudad (sin importar acentos)", () => {
    expect(pickByPlace(items, { city: "Paris", country: "FR" }).map((i) => i.id)).toEqual(["par"]);
  });
  it("REQ-005: si no hay en la ciudad, lo del mismo país", () => {
    expect(pickByPlace(items, { city: "Manchester", country: "GB" }).map((i) => i.id)).toEqual(["lon", "edi"]);
  });
  it("REQ-005: sin ciudad ni país coincidentes no ofrece nada", () => {
    expect(pickByPlace(items, { city: "Lima", country: "PE" })).toEqual([]);
    expect(pickByPlace(items, { city: null, country: null })).toEqual([]);
  });
  it("REQ-006: como mucho n opciones", () => {
    expect(pickByPlace(items, { city: null, country: "GB" }, 1)).toHaveLength(1);
  });
  it("REQ-007: sirve igual al revés (tours para un transporte)", () => {
    const tours = [{ id: "t1", cities: ["Paris"], countries: ["FR"] }, { id: "t2", cities: ["Lyon"], countries: ["FR"] }];
    expect(pickByPlace(tours, { city: "París", country: "FR" }).map((t) => t.id)).toEqual(["t1"]);
  });
});
