// REQ-10836: fuente del modelo de la ficha de un viaje publicado, con dependencias inyectadas. npx vitest run src/ficha/source.test.ts
import { describe, expect, it, vi } from "vitest";
import fixture from "../../tests/fixtures/trips/tas-mys-01-malasia-esencial.json";
import { loadTripFicha, type TripFichaDeps } from "./source";
import type { StoredTrip } from "@/trips/manage";

const deps = (over: Partial<TripFichaDeps> = {}): TripFichaDeps => ({
  tripBySlug: async (slug) => (slug === fixture.slug ? { trip: fixture as unknown as StoredTrip, translations: null, agencyName: fixture.agencyName } : null),
  env: { SITE_URL: "https://travelpuzzle.com.mx", ZONE_MAP_ENABLED: "true" },
  now: () => new Date("2026-11-20T20:00:00Z"),
  ...over,
});

describe("REQ-10836: viaje publicado → modelo validado", () => {
  it("REQ-10836: con el slug publicado devuelve el modelo validado, la agencia dueña, la ruta pública y la hora de lectura", async () => {
    const r = await loadTripFicha(deps(), fixture.slug, "es");
    expect(r.load.ok).toBe(true);
    if (!r.load.ok) return;
    expect(r.load.ficha).toMatchObject({ provider: "propios", code: fixture.code, title: fixture.titleEs });
    expect(r.load.ficha.gallery[0].url).toMatch(/^https:\/\/travelpuzzle\.com\.mx\/api\/viajes\/foto\//);
    expect(r.load.readAt).toBe("2026-11-20T20:00:00.000Z");
    expect(r.agencyId).toBe(fixture.agencyId);
    expect(r.path).toBe(`/viajes/malasia/${fixture.slug}`);
  });
  it("REQ-10836: un slug que no existe o un viaje apagado es not-found, sin agencia ni ruta", async () => {
    const r = await loadTripFicha(deps(), "no-existe", "es");
    expect(r.load).toEqual({ ok: false, reason: "not-found", detail: null });
    expect(r.agencyId).toBeNull();
    expect(r.path).toBeNull();
  });
  it("REQ-10836: un registro malo se descarta y se registra, no tumba la lectura (blindaje punto 8)", async () => {
    const log = vi.fn();
    const roto = { ...(fixture as unknown as StoredTrip), titleEs: "" } as StoredTrip;
    const r = await loadTripFicha(deps({ tripBySlug: async () => ({ trip: roto, translations: null, agencyName: null }), log }), fixture.slug, "es");
    expect(r.load.ok).toBe(false);
    if (r.load.ok) return;
    expect(r.load.reason).toBe("invalid");
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ kind: "invalid" }));
  });
  it("REQ-10836: no lee la base ni el entorno por su cuenta: todo llega por parámetro", async () => {
    const tripBySlug = vi.fn(async () => null);
    await loadTripFicha(deps({ tripBySlug }), "x", "en");
    expect(tripBySlug).toHaveBeenCalledWith("x");
  });
});
