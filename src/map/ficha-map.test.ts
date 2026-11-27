// REQ-10736: la vista del mapa de la ficha se decide en el servidor con las coordenadas de la ciudad (City.lat/lng, 0035).
// npx vitest run src/map/ficha-map.test.ts
import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { loadFichaMap } from "./ficha-map";

const prisma = (city: { lat: number | null; lng: number | null } | null) => ({ city: { findUnique: async () => city } }) as unknown as PrismaClient;
const ON = { ZONE_MAP_ENABLED: "true" };

describe("REQ-10736: vista del mapa de la ficha", () => {
  it("REQ-10736: con punto exacto no consulta la ciudad y conserva «Cómo llegar»", async () => {
    const p = { city: { findUnique: vi.fn() } } as unknown as PrismaClient;
    expect(await loadFichaMap({ prisma: p, cityId: 7, coords: "40.4154,-3.7074", env: ON })).toEqual({ kind: "exact", lat: 40.4154, lng: -3.7074, directions: true });
    expect((p.city.findUnique as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("REQ-10736: sin punto exacto y bandera encendida, «Zona aproximada» en el centro de la ciudad, sin botón", async () => {
    expect(await loadFichaMap({ prisma: prisma({ lat: 40.4168, lng: -3.7038 }), cityId: 7, coords: "", env: ON })).toEqual({ kind: "zone", lat: 40.4168, lng: -3.7038, radiusM: 1500, directions: false });
  });

  it("REQ-10737: con la bandera apagada, o sin coordenadas de ciudad, null (ni mapa ni centro inventado)", async () => {
    expect(await loadFichaMap({ prisma: prisma({ lat: 40.4168, lng: -3.7038 }), cityId: 7, coords: "", env: { ZONE_MAP_ENABLED: "false" } })).toBeNull();
    expect(await loadFichaMap({ prisma: prisma({ lat: null, lng: null }), cityId: 7, coords: null, env: ON })).toBeNull();
    expect(await loadFichaMap({ prisma: prisma(null), cityId: 7, coords: null, env: ON })).toBeNull();
  });

  it("REQ-10736: si D1 falla, la ficha sigue (null) y no tumba la página", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const p = { city: { findUnique: () => Promise.reject(new Error("D1")) } } as unknown as PrismaClient;
    expect(await loadFichaMap({ prisma: p, cityId: 7, coords: "", env: ON })).toBeNull();
  });
});
