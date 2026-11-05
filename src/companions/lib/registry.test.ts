import { describe, expect, it } from "vitest";
import { DEFAULT_REGISTRY, hubModel, parseRegistry, probeRegistry } from "./registry";
import { buildArmaTuViajeModel, parseTripQuery } from "@/cart/lib/page-model";
import type { ProviderAdapter } from "@/cart/lib/adapter";

const fakeRequest = (id: string, types: ProviderAdapter["types"], chargedBy = "Travel Puzzle"): ProviderAdapter => ({
  id, mode: "request", types, chargedBy,
  search: async (q) => (types.includes(q.type) ? [{ externalId: `${id}-1`, title: id, url: `https://wa.me/525536490320?text=${id}` }] : []),
  availability: async () => ({ available: true }),
  reserve: async () => ({ kind: "redirect", url: "https://wa.me/x" }), cancel: async () => ({ ok: false }), charge: async () => ({ kind: "none" }),
});

describe("Registro de complementos", () => {
  it("REQ-121: el registro por defecto trae traslados (Kiwitaxi) y bus turístico (Big Bus) en Transporte", () => {
    const hub = hubModel(DEFAULT_REGISTRY, { whatsapp: "525536490320", citiesByEntry: {} });
    const transporte = hub.find((g) => g.group === "transporte")!;
    expect(transporte.title).toBe("Transporte");
    expect(transporte.cards.map((c) => [c.id, c.chargedByLabel])).toEqual([
      ["kiwitaxi", "Lo reservas con Kiwitaxi"],
      ["bigbus", "Lo reservas con Travel Puzzle"],
    ]);
  });

  it("REQ-121: Big Bus en el hub: solicitud «a cotizar», sin precio inventado ni pago directo, con sus ciudades", () => {
    const hub = hubModel(DEFAULT_REGISTRY, { whatsapp: "525536490320", citiesByEntry: { bigbus: ["Londres", "Ciudad de México"] } });
    const bb = hub[0].cards.find((c) => c.id === "bigbus")!;
    expect(bb.price).toBe("A cotizar");
    expect(bb.cta).toMatchObject({ kind: "request", label: "Pedir a Travel Puzzle" });
    expect(bb.cities).toEqual(["Ciudad de México", "Londres"]);
    expect(JSON.stringify(bb)).not.toMatch(/Pagar|checkout|stripe/i);
  });

  it("REQ-121: una categoría nueva en el registro aparece sola en la sección y en el carrusel", async () => {
    const extra = parseRegistry([
      ...DEFAULT_REGISTRY,
      { id: "autos", adapter: "request", provider: "Renta Local", product: "una renta de auto", category: "car_rental", group: "transporte",
        title: "Renta de auto", description: "Un auto para moverte a tu ritmo.", hubAction: "request" },
    ]);
    const hub = hubModel(extra, { whatsapp: "525536490320", citiesByEntry: {} });
    expect(hub[0].cards.map((c) => c.id)).toContain("autos");

    const query = { type: "tour" as const, cityCode: "es-madrid", cityName: "Madrid", country: "ES", date: "2026-12-10", people: { adults: 2, children: 0 } };
    const withTours = parseRegistry([...extra, { id: "tours", adapter: "request", provider: "Guías", product: "un tour", category: "tour", group: "tours", title: "Tour", description: "Un tour.", hubAction: "request" }]);
    const probes = await probeRegistry(withTours, { autos: fakeRequest("autos", ["car_rental"]), tours: fakeRequest("tours", ["tour"]) }, query);
    expect(probes.car_rental?.[0]).toMatchObject({ adapterId: "autos", mode: "request", result: "inventory" });
    // Sin asesor genérico, solo se pintan las categorías con adaptador: el tour y la nueva de autos.
    const m = buildArmaTuViajeModel({
      piece: { title: "Free tour Madrid", date: "2026-12-10T10:00:00Z", cityName: "Madrid", people: query.people },
      query: parseTripQuery({ pais: "ES", cc: "es-madrid" }), advisor: { whatsapp: null }, probes, flags: {}, now: Date.parse("2026-12-01T00:00:00Z"),
    });
    expect(m.cards.map((c) => [c.type, c.action?.kind, c.chargedByLabel])).toEqual([
      ["tour", "request", "Lo reservas con Travel Puzzle"],
      ["car_rental", "request", "Lo reservas con Travel Puzzle"],
    ]);
  });

  it("REQ-121: un registro malo no entra", () => {
    expect(() => parseRegistry([{ id: "x", adapter: "magia", category: "transfer" }])).toThrow();
  });
});
