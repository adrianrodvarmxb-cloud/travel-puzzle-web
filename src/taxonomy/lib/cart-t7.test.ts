import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createFreetourAdapter } from "@/cart/adapters/freetour";
import { buildCarousel, type CarouselCandidate } from "@/companions/lib/carousel";
import { taxonomyCartEnabled } from "./cart-type";

const api = { get: async () => ({}), post: async () => ({}) };
const offers = [
  { externalId: "1", title: "Free tour", formato: "pieza-libre" },
  { externalId: "2", title: "Barrio a pie", formato: "caminata" },
  { externalId: "3", title: "Toledo desde Madrid", formato: "excursion-dia" },
  { externalId: "4", title: "Museo", formato: "entradas" },
  { externalId: "5", title: "Sin formato" },
];
const q = (type: "free_tour" | "tour" | "day_trip" | "tickets") => ({ type, cityCode: "madrid", date: "2026-11-20", people: { adults: 2, children: 0 } }) as never;

describe("T7 carrito y carrusel por formato (REQ-428, REQ-429)", () => {
  it("REQ-428 bandera TAXONOMY_CART_ENABLED en \"false\"", () => {
    expect(taxonomyCartEnabled({ TAXONOMY_CART_ENABLED: "true" })).toBe(true);
    expect(taxonomyCartEnabled({})).toBe(false);
    expect(readFileSync("wrangler.jsonc", "utf8")).toMatch(/"TAXONOMY_CART_ENABLED":\s*"true"/);
  });
  it("REQ-428 apagada: el adaptador de FREETOUR ofrece lo de hoy (free_tour y tour) sin filtrar", async () => {
    const a = createFreetourAdapter({ api, paymentsEnabled: false, findEvents: async () => offers });
    expect(a.types).toEqual(["free_tour", "tour"]);
    expect(await a.search(q("tour"))).toHaveLength(5);
  });
  it("REQ-428 encendida: también day_trip y tickets, y cada oferta va al tipo de su formato; sin formato, solo free_tour y tour", async () => {
    const a = createFreetourAdapter({ api, paymentsEnabled: false, findEvents: async () => offers, taxonomy: true });
    expect(a.types).toEqual(["free_tour", "tour", "day_trip", "tickets"]);
    expect((await a.search(q("day_trip"))).map((o) => o.externalId)).toEqual(["3"]);
    expect((await a.search(q("tickets"))).map((o) => o.externalId)).toEqual(["4"]);
    expect((await a.search(q("tour"))).map((o) => o.externalId)).toEqual(["2", "5"]);
    expect((await a.search(q("free_tour"))).map((o) => o.externalId)).toEqual(["1", "5"]);
  });
  const cand = (type: CarouselCandidate["type"], formato?: string): CarouselCandidate => ({ type, formato, title: `T ${type}`, chargedBy: "X", action: { kind: "deeplink", label: "Ver opciones", adapterId: "x", url: "https://x" } });
  const ctx = { country: "ES", cityCode: "madrid", now: 0 };
  it("REQ-429 encendida: la primera tarjeta se elige por formato; una audioguía en «tour» no cuenta como primera", () => {
    const cands = [cand("tour", "autoguiado"), cand("transfer"), cand("tickets", "entradas")];
    expect(buildCarousel({ candidates: cands, context: ctx, device: "desktop", rules: [], flags: {}, firstByFormat: true })).toEqual([]);
    const ok = buildCarousel({ candidates: [cand("transfer"), cand("day_trip", "excursion-dia"), cand("tickets", "entradas")], context: ctx, device: "desktop", rules: [], flags: {}, firstByFormat: true });
    expect(ok[0]).toMatchObject({ category: "day_trip", formato: "excursion-dia" });
  });
  it("REQ-429 apagada (o sin formato en la tarjeta): la regla de hoy por categoría (REQ-108)", () => {
    const cands = [cand("tour", "autoguiado"), cand("transfer")];
    expect(buildCarousel({ candidates: cands, context: ctx, device: "desktop", rules: [], flags: {} })[0].category).toBe("tour");
    expect(buildCarousel({ candidates: [cand("tour"), cand("transfer")], context: ctx, device: "desktop", rules: [], flags: {}, firstByFormat: true })[0].category).toBe("tour");
  });
});
