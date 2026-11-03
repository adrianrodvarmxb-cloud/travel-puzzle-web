import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { loadMapCities, loadCityCard } from "./load";

describe("datos del mapa", () => {
  it("arma los puntos con el nombre de cada ciudad", async () => {
    const prisma = {
      $queryRaw: async () => [{ cityId: 7, c: "45.43,12.33" }, { cityId: 7, c: "45.44,12.34" }],
      city: { findMany: async () => [{ id: 7, countryId: 75, translations: { en: "Venice", es: "Venecia" } }] },
    } as unknown as PrismaClient;
    const out = await loadMapCities({ prisma });
    expect(out).toEqual([{ cityId: 7, countryId: 75, names: { en: "Venice", es: "Venecia" }, lat: 45.435, lng: 12.335, tours: 2 }]);
  });
  it("si la base falla, el mapa sale vacío sin romper la página", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const prisma = { $queryRaw: () => Promise.reject(new Error("D1")) } as unknown as PrismaClient;
    expect(await loadMapCities({ prisma })).toEqual([]);
    expect(await loadCityCard(7, { prisma, includePaid: false })).toBeNull();
  });
});
