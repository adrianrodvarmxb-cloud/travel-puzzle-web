// REQ-10844: fuente del modelo de la ficha de un tour de Tangol, con dependencias inyectadas. npx vitest run src/ficha/source-tour.test.ts
import { describe, expect, it, vi } from "vitest";
import fixture from "../../tests/fixtures/tangol/tour-43-glaciar-perito-moreno.json";
import { loadTourFicha, type TourFichaDeps } from "./source-tour";
import type { TourRowWithRelations } from "./lib/tour-input";

const { translation, city, country, whatToBring, physicalRequirements, difficulty, providerNotes, childAgeFrom, childAgeTo, ...tour } = fixture;
const row = (): TourRowWithRelations => ({
  ...tour,
  translations: [{ language: "es", title: translation.title, brief: translation.brief, description: translation.description }],
  city: { slug: city.slug, translations: { es: city.name }, lat: -50.34, lng: -72.26 },
  country: { code: "ARG", iso2: country.code, translations: { es: country.name } },
} as unknown as TourRowWithRelations);
const practical = { whatToBring, physicalRequirements, difficulty, providerNotes, childAgeFrom, childAgeTo };

const deps = (over: Partial<TourFichaDeps> = {}): TourFichaDeps => ({
  tourBySlug: async (slug) => (slug === fixture.slug ? row() : null),
  practicalRow: async () => practical,
  env: { ZONE_MAP_ENABLED: "true" },
  now: () => new Date("2026-11-21T09:00:00Z"),
  ...over,
});

describe("REQ-10844: tour de Tangol → modelo validado", () => {
  it("REQ-10844: con el slug devuelve el modelo validado, el proveedor, la ruta pública y la hora de lectura", async () => {
    const r = await loadTourFicha(deps(), fixture.slug, "es");
    expect(r.load.ok).toBe(true);
    if (!r.load.ok) return;
    expect(r.load.ficha).toMatchObject({ provider: "tangol", externalRef: "43", title: "Glaciar Perito Moreno" });
    expect(r.load.ficha.whatToBring).toHaveLength(4);
    expect(r.load.readAt).toBe("2026-11-21T09:00:00.000Z");
    expect(r.providerId).toBe("tangol");
    expect(r.path).toBe("/destinos/ar/el-calafate/glaciar-perito-moreno");
  });
  it("REQ-10844: un slug que no existe es not-found, sin proveedor ni ruta", async () => {
    const r = await loadTourFicha(deps(), "no-existe", "es");
    expect(r.load).toEqual({ ok: false, reason: "not-found", detail: null });
    expect(r.providerId).toBeNull();
    expect(r.path).toBeNull();
  });
  it("REQ-10844: un proveedor sin adaptador (FREETOUR) es not-found: Mila nunca lo recibe (decisión 42)", async () => {
    const r = await loadTourFicha(deps({ tourBySlug: async () => ({ ...row(), providerId: "freetour" }) }), fixture.slug, "es");
    expect(r.load.ok).toBe(false);
    expect(r.providerId).toBe("freetour");
    expect(r.path).toBeNull();
  });
  it("REQ-10844: si la fila práctica falla, la ficha sigue sin esos bloques (regla 7) y se registra", async () => {
    const log = vi.fn();
    const r = await loadTourFicha(deps({ practicalRow: async () => { throw new Error("D1_ERROR"); }, log }), fixture.slug, "es");
    expect(r.load.ok).toBe(true);
    if (!r.load.ok) return;
    expect(r.load.ficha.whatToBring).toEqual([]);
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ kind: "practical" }));
  });
  it("REQ-10844: no lee la base ni el entorno por su cuenta: todo llega por parámetro", async () => {
    const tourBySlug = vi.fn(async () => null);
    const practicalRow = vi.fn(async () => null);
    await loadTourFicha(deps({ tourBySlug, practicalRow }), "x", "en");
    expect(tourBySlug).toHaveBeenCalledWith("x");
    expect(practicalRow).not.toHaveBeenCalled();
  });
});

describe("REQ-10944: opciones con precio público desde TourOption (0036)", () => {
  it("REQ-10944: con optionRows, cada opción trae su precio y traslado y el traslado sale como adicional; si la lectura falla, la ficha sigue sin precios y lo registra", async () => {
    const t = row();
    const conReglas = { ...t, availabilityRules: { options: [{ code: "CT", startTime: "08:00" }, { code: "ST", startTime: "08:30" }] } } as unknown as TourRowWithRelations;
    const optionRows = vi.fn(async () => [
      { code: "CT", description: "Con traslado", startTime: "08:00", currency: "USD", rackAdult: 52, transferIncluded: true },
      { code: "ST", description: "Sin traslado", startTime: "08:30", currency: "USD", rackAdult: 40, transferIncluded: false },
    ]);
    const r = await loadTourFicha(deps({ tourBySlug: async () => conReglas, optionRows }), fixture.slug, "es");
    expect(r.load.ok).toBe(true);
    if (!r.load.ok) return;
    expect(optionRows).toHaveBeenCalledWith(t.id);
    expect(r.load.ficha.options.map((o) => [o.id, o.price?.amount ?? null, o.transferIncluded])).toEqual([["CT", 52, true], ["ST", 40, false]]);
    expect(r.load.ficha.addons?.[0]).toMatchObject({ kind: "transfer", price: { amount: 12, currency: "USD" } });
    const log = vi.fn();
    const r2 = await loadTourFicha(deps({ tourBySlug: async () => conReglas, optionRows: async () => { throw new Error("D1_ERROR"); }, log }), fixture.slug, "es");
    expect(r2.load.ok).toBe(true);
    if (!r2.load.ok) return;
    expect(r2.load.ficha.options.every((o) => o.price === null)).toBe(true);
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ kind: "options" }));
  });
});
