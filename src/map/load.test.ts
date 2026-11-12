import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { loadMapCities, loadCityCard, loadPlaceCard } from "./load";

const vis = { own: true, transport: false };

describe("datos del mapa", () => {
  it("arma los puntos con el nombre de cada ciudad", async () => {
    const prisma = {
      $queryRaw: async () => [{ cityId: 7, c: "45.43,12.33" }, { cityId: 7, c: "45.44,12.34" }],
      city: { findMany: async () => [{ id: 7, countryId: 75, translations: { en: "Venice", es: "Venecia" } }] },
    } as unknown as PrismaClient;
    const out = await loadMapCities({ prisma, vis });
    expect(out).toEqual([{ cityId: 7, countryId: 75, names: { en: "Venice", es: "Venecia" }, lat: 45.435, lng: 12.335, tours: 2 }]);
  });
  it("si la base falla, el mapa sale vacío sin romper la página", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const prisma = { $queryRaw: () => Promise.reject(new Error("D1")) } as unknown as PrismaClient;
    expect(await loadMapCities({ prisma, vis })).toEqual([]);
    expect(await loadCityCard(7, { prisma, includePaid: false, vis })).toBeNull();
  });

  const tripRows = [
    { id: "a", slug: "venecia-en-gondola", kind: "tour", titleEs: "Venecia en góndola", images: [], priceFrom: 90, currency: "EUR", countries: ["IT"], cities: ["Venecia"], meetingPoints: [] },
    { id: "b", slug: "kuelap", kind: "tour", titleEs: "Kuélap", images: [], priceFrom: 120, currency: "USD", countries: ["PE"], cities: ["Chachapoyas"], meetingPoints: [{ name: "Plaza", lat: -6.23, lng: -77.87 }] },
    { id: "c", slug: "big-bus", kind: "transporte", titleEs: "Bus", images: [], priceFrom: 30, currency: "EUR", countries: ["IT"], cities: ["Venecia"], meetingPoints: [] },
  ];
  const fakePrisma = () => ({
    $queryRaw: async () => [{ cityId: 7, c: "45.43,12.33" }],
    trip: { findMany: async () => tripRows },
    city: {
      findMany: async (q: { where: { country?: unknown } }) =>
        q.where.country ? [{ id: 7, translations: { es: "Venecia" }, country: { iso2: "IT" } }] : [{ id: 7, countryId: 75, translations: { es: "Venecia" } }],
      findUnique: async () => ({ id: 7, countryId: 75, translations: { es: "Venecia" } }),
    },
    tour: { count: async () => 1, findMany: async () => [] },
  }) as unknown as PrismaClient;

  it("REQ-1575: los viajes visibles suman en su ciudad; el transporte no", async () => {
    const out = await loadMapCities({ prisma: fakePrisma(), vis });
    expect(out.find((c) => c.cityId === 7)?.tours).toBe(2);
    const card = await loadCityCard(7, { prisma: fakePrisma(), includePaid: false, vis });
    expect(card?.tours).toBe(2);
    expect(card?.top[0]).toMatchObject({ id: "trip:a", href: "/viajes/italia/venecia-en-gondola" });
  });

  it("REQ-1575: con los viajes apagados (OWN_TOURS_ENABLED) el mapa queda como antes", async () => {
    const out = await loadMapCities({ prisma: fakePrisma(), vis: { own: false, transport: false } });
    expect(out).toEqual([{ cityId: 7, countryId: 75, names: { es: "Venecia" }, lat: 45.43, lng: 12.33, tours: 1 }]);
  });

  it("REQ-1578: el lugar sin ciudad del catálogo sale como pin propio con su tarjeta", async () => {
    const out = await loadMapCities({ prisma: fakePrisma(), vis });
    expect(out).toContainEqual({ cityId: 0, place: "pe-chachapoyas", countryId: 0, names: { es: "Chachapoyas" }, lat: -6.23, lng: -77.87, tours: 1 });
    const card = await loadPlaceCard("pe-chachapoyas", { prisma: fakePrisma(), vis });
    expect(card).toMatchObject({ place: "pe-chachapoyas", tours: 1, top: [{ id: "trip:b", href: "/viajes/peru/kuelap" }] });
    expect(await loadPlaceCard("no-existe", { prisma: fakePrisma(), vis })).toBeNull();
  });
});
