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

  it("REQ-3538: agencias y tipos distintos de una misma ciudad suman solos; el transporte no", async () => {
    const rows = ["circuito", "tour", "unica", "personalizado"].map((kind, i) => ({
      id: `n${i}`, slug: `nuevo-${i}`, kind, titleEs: `Nuevo ${i}`, images: [], priceFrom: 50, currency: "EUR", countries: ["IT"], cities: ["Venecia"], meetingPoints: [],
    }));
    const prisma = {
      $queryRaw: async () => [{ cityId: 7, c: "45.43,12.33" }],
      trip: { findMany: async () => [...rows, { ...rows[0], id: "t", slug: "bus", kind: "transporte" }] },
      city: {
        findMany: async (q: { where: { country?: unknown } }) =>
          q.where.country ? [{ id: 7, translations: { es: "Venecia" }, country: { iso2: "IT" } }] : [{ id: 7, countryId: 75, translations: { es: "Venecia" } }],
      },
    } as unknown as PrismaClient;
    const out = await loadMapCities({ prisma, vis: { own: true, transport: false } });
    expect(out.find((c) => c.cityId === 7)?.tours).toBe(1 + rows.length); // 1 tour + 4 viajes de tipos distintos, sin transporte
  });
});

// Ficha única, ola 4 (decisión 27): una ciudad con tours pero sin ningún punto de encuentro usa sus coordenadas (City.lat/lng,
// migración 0035) como pin del mapa, solo con CITY_PIN_FALLBACK_ENABLED; apagada, el mapa es el de siempre.
describe("REQ-10735 / REQ-10737: pin de respaldo por coordenadas de ciudad en el mapa", () => {
  const prismaSinPunto = () => ({
    $queryRaw: async () => [{ cityId: 7, c: "45.43,12.33" }, { cityId: 9, c: null }, { cityId: 9, c: "" }, { cityId: 11, c: null }],
    city: {
      findMany: async () => [
        { id: 7, countryId: 75, translations: { es: "Venecia" }, lat: 45.44, lng: 12.32 },
        { id: 9, countryId: 75, translations: { es: "Bérgamo" }, lat: 45.6983, lng: 9.677 },
        { id: 11, countryId: 75, translations: { es: "Sin coordenadas" }, lat: null, lng: null },
      ],
    },
  }) as unknown as PrismaClient;

  it("REQ-10735: con la bandera encendida, la ciudad sin puntos sale en sus coordenadas; sin coordenadas sigue fuera; con puntos no cambia", async () => {
    const out = await loadMapCities({ prisma: prismaSinPunto(), vis: { own: false, transport: false }, env: { CITY_PIN_FALLBACK_ENABLED: "true" } });
    expect(out).toEqual([
      { cityId: 7, countryId: 75, names: { es: "Venecia" }, lat: 45.43, lng: 12.33, tours: 1 },
      { cityId: 9, countryId: 75, names: { es: "Bérgamo" }, lat: 45.6983, lng: 9.677, tours: 2 },
    ]);
  });

  it("REQ-10737: con la bandera apagada, solo las ciudades con punto de encuentro (como hoy)", async () => {
    const out = await loadMapCities({ prisma: prismaSinPunto(), vis: { own: false, transport: false }, env: { CITY_PIN_FALLBACK_ENABLED: "false" } });
    expect(out.map((c) => c.cityId)).toEqual([7]);
  });

  it("REQ-10735: un viaje sin punto de encuentro en una ciudad del catálogo también usa las coordenadas de la ciudad (solo con la bandera)", async () => {
    const trips = [{ id: "a", slug: "bergamo-alta", kind: "tour", titleEs: "Bérgamo Alta", images: [], priceFrom: 40, currency: "EUR", countries: ["IT"], cities: ["Bérgamo"], meetingPoints: [] }];
    const prisma = (lat: number | null) => ({
      $queryRaw: async () => [],
      trip: { findMany: async () => trips },
      city: {
        findMany: async (q: { where: { country?: unknown } }) =>
          q.where.country ? [{ id: 9, translations: { es: "Bérgamo" }, country: { iso2: "IT" } }] : [{ id: 9, countryId: 75, translations: { es: "Bérgamo" }, lat, lng: 9.677 }],
      },
    }) as unknown as PrismaClient;
    const on = await loadMapCities({ prisma: prisma(45.6983), vis, env: { CITY_PIN_FALLBACK_ENABLED: "true" } });
    expect(on).toEqual([{ cityId: 9, countryId: 75, names: { es: "Bérgamo" }, lat: 45.6983, lng: 9.677, tours: 1 }]);
    expect(await loadMapCities({ prisma: prisma(null), vis, env: { CITY_PIN_FALLBACK_ENABLED: "true" } })).toEqual([]);
    expect(await loadMapCities({ prisma: prisma(45.6983), vis, env: { CITY_PIN_FALLBACK_ENABLED: "false" } })).toEqual([]);
  });
});
