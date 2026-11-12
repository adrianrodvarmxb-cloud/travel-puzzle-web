import { describe, it, expect } from "vitest";
import { buildCatalogPlan, matchCity, normalizeName } from "./catalog";
import { productSchema } from "./schemas";
import { sampleProduct } from "./fixtures";
import cities from "../data/bigbus-ciudades.json";
import bigbus from "../../../imports/bigbus-2026.json";

const map = cities as unknown as Record<string, string[]>;
const prod = (over: Record<string, unknown>) => productSchema.parse({ ...sampleProduct(), ...over });

describe("ligar productos OCTO con las ciudades de Big Bus", () => {
  it("REQ-3413: el mapa cubre exactamente las 29 ciudades cargadas", () => {
    const refs = (bigbus as { trips: { ref: string }[] }).trips.map((t) => t.ref).sort();
    expect(Object.keys(map).filter((k) => !k.startsWith("_")).sort()).toEqual(refs);
  });

  it("REQ-3413: reconoce la ciudad por nombre, sin acentos ni mayúsculas", () => {
    expect(normalizeName("München – Hop-On")).toBe("munchen hop on");
    expect(matchCity({ internalName: "New York Hop-on Hop-off Discover", reference: null }, map)).toBe("NYC");
    expect(matchCity({ internalName: "Big Bus München Classic", reference: null }, map)).toBe("MUC");
    expect(matchCity({ internalName: "Classic", reference: "PARIS-48H" }, map)).toBe("PAR");
  });

  it("REQ-3413: sin coincidencia o con dos ciudades, no se liga", () => {
    expect(matchCity({ internalName: "Gift card", reference: null }, map)).toBeNull();
    expect(matchCity({ internalName: "Dubai and Abu Dhabi combo", reference: null }, map)).toBeNull();
    expect(matchCity({ internalName: "Romance cruise", reference: null }, map)).toBeNull();
  });
});

describe("plan del catálogo", () => {
  const now = new Date("2026-11-12T09:00:00Z");

  it("REQ-3414: solo se vende lo que devuelve la API; las ciudades sin producto quedan fuera", () => {
    const plan = buildCatalogPlan([prod({ internalName: "New York Discover" })], ["NYC", "LON"], map, now);
    expect(plan.cities.map((c) => c.ref)).toEqual(["NYC"]);
    expect(plan.notResold).toEqual(["LON"]);
    expect(plan.cities[0].from).toEqual({ amount: 49, currency: "USD" });
    expect(plan.cities[0].products[0].options[0].units.map((u) => u.type)).toEqual(["ADULT", "CHILD"]);
  });

  it("REQ-3414: sin precio completo o sin ciudad, se reporta y no se vende", () => {
    const raw = sampleProduct() as { id: string; internalName: string; options: { units: { pricingFrom: unknown[] }[] }[] };
    raw.id = "sin-precio";
    raw.internalName = "London Classic";
    raw.options[0].units[0].pricingFrom = [];
    const plan = buildCatalogPlan([productSchema.parse(raw), prod({ id: "x", internalName: "Gift card" })], ["LON"], map, now);
    expect(plan.cities).toEqual([]);
    expect(plan.unpriced).toEqual([{ productId: "sin-precio", name: "London Classic" }]);
    expect(plan.unmatched).toEqual([{ productId: "x", name: "Gift card" }]);
  });

  it("REQ-3414: el plan no lleva el net", () => {
    const plan = buildCatalogPlan([prod({ internalName: "New York Discover" })], ["NYC"], map, now);
    expect(JSON.stringify(plan)).not.toMatch(/"net"|39\.2/);
  });
});
