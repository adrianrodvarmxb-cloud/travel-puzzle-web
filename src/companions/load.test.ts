import { describe, expect, it } from "vitest";
import { providerCities, type TripCitiesDb } from "./load";

describe("Ciudades de un proveedor de complementos", () => {
  it("REQ-121: junta las ciudades de los viajes de la agencia, sin repetir", async () => {
    const db: TripCitiesDb = { trip: { findMany: async (args) => {
      expect(args.where.agency.name.contains).toBe("Big Bus");
      return [{ cities: ["Londres", "París"] }, { cities: ["Londres", ""] }, { cities: null }];
    } } };
    expect(await providerCities(db, "Big Bus")).toEqual(["Londres", "París"]);
  });

  it("REQ-121: si la base falla, lista vacía (no rompe la página)", async () => {
    const db: TripCitiesDb = { trip: { findMany: async () => { throw new Error("D1"); } } };
    expect(await providerCities(db, "Big Bus")).toEqual([]);
  });
});
