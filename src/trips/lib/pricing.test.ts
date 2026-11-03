import { describe, it, expect } from "vitest";
import { priceFrom, seasonFor, type TripOption } from "./pricing";

const opt = (adult: number | null, over: Partial<TripOption> = {}): TripOption => ({ id: "o", name: "Grupo", mode: "group", adult, child: null, infant: null, childAgeMin: 3, childAgeMax: 11, ...over });

describe("priceFrom", () => {
  it("el menor precio adulto de las opciones", () => {
    expect(priceFrom([opt(120), opt(95), opt(null)])).toBe(95);
  });
  it("sin precios: null", () => {
    expect(priceFrom([opt(null)])).toBeNull();
    expect(priceFrom([])).toBeNull();
  });
});

describe("seasonFor", () => {
  const seasons = [{ name: "Verano", from: "2027-06-01", to: "2027-08-31", supplement: 20 }];
  it("aplica el suplemento dentro del rango", () => {
    expect(seasonFor("2027-07-10", seasons)?.supplement).toBe(20);
    expect(seasonFor("2027-09-01", seasons)).toBeNull();
  });
});
