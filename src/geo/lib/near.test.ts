import { describe, expect, it } from "vitest";
import { nearUnified, nearbyUnifiedEnabled, transportAllowedFor, NEAR_RADII_KM } from "./near";

const it_ = (id: string, cities: string[], countries: string[], point: { lat: number; lng: number } | null = null, provider = "propios") => ({
  id,
  cities,
  countries,
  point,
  provider,
});
const paris = { lat: 48.8566, lng: 2.3522 };
const lyon = { lat: 45.764, lng: 4.8357 };
const bruselas = { lat: 50.8503, lng: 4.3517 };
const madrid = { lat: 40.4168, lng: -3.7038 };
const items = [
  it_("par", ["París"], ["FR"], paris),
  it_("lyo", ["Lyon"], ["FR"], lyon),
  it_("bru", ["Bruselas"], ["BE"], bruselas),
  it_("mad", ["Madrid"], ["ES"], madrid),
];

describe("nearUnified — «Cerca» único: ciudad → país → distancia (decisión 29)", () => {
  it("REQ-10750: primero lo de la misma ciudad, sin importar acentos ni mayúsculas", () => {
    const r = nearUnified(items, { city: "paris", country: "FR", point: null });
    expect(r.tier).toBe("city");
    expect(r.items.map((i) => i.id)).toEqual(["par"]);
  });
  it("REQ-10750: sin nada en la ciudad, lo del mismo país; con punto, lo más cercano primero", () => {
    const r = nearUnified(items, { city: "Marsella", country: "FR", point: { lat: 43.2965, lng: 5.3698 } });
    expect(r.tier).toBe("country");
    expect(r.items.map((i) => i.id)).toEqual(["lyo", "par"]);
  });
  it("REQ-10750: sin ciudad ni país coincidentes, por distancia en radios crecientes y nunca un punto inventado", () => {
    // Lille (FR, pero sin nada en FR en esta lista acotada): Bruselas a ~95 km entra en el primer radio.
    const soloBelgica = items.filter((i) => i.countries.includes("BE") || i.countries.includes("ES"));
    const r = nearUnified(soloBelgica, { city: "Lille", country: "FR", point: { lat: 50.6292, lng: 3.0573 } });
    expect(r.tier).toBe(`radius-${NEAR_RADII_KM[0]}`);
    expect(r.items.map((i) => i.id)).toEqual(["bru"]);
    // Sin punto de origen no hay escalón de distancia: vacío, no un pin inventado.
    expect(nearUnified(soloBelgica, { city: "Lille", country: "FR", point: null })).toEqual({ tier: null, items: [] });
  });
  it("REQ-10750: el candidato sin punto no entra al escalón de distancia pero sí a los de ciudad y país", () => {
    const sinPunto = [it_("x", ["Lille"], ["FR"], null)];
    expect(nearUnified(sinPunto, { city: "Lille", country: "FR", point: null }).items.map((i) => i.id)).toEqual(["x"]);
    expect(nearUnified(sinPunto, { city: "Gante", country: "BE", point: bruselas })).toEqual({ tier: null, items: [] });
  });
  it("REQ-10750: como mucho `max` resultados y el orden de entrada se respeta en empates", () => {
    const muchos = [it_("a", ["X"], ["FR"]), it_("b", ["X"], ["FR"]), it_("c", ["X"], ["FR"]), it_("d", ["X"], ["FR"])];
    expect(nearUnified(muchos, { city: "X", country: "FR", point: null }).items.map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(nearUnified(muchos, { city: "X", country: "FR", point: null }, { max: 1 }).items).toHaveLength(1);
  });
  it("REQ-10750: nunca propone un producto de FREETOUR y nunca sugiere nada si el origen es FREETOUR y lo pedido es un afiliado", () => {
    const conFt = [...items, it_("ft", ["París"], ["FR"], paris, "freetour")];
    expect(nearUnified(conFt, { city: "París", country: "FR", point: paris }).items.map((i) => i.id)).toEqual(["par"]);
    expect(nearUnified(conFt, { city: "París", country: "FR", point: paris, provider: "freetour" }, { affiliate: true })).toEqual({ tier: null, items: [] });
    // Un origen de FREETOUR sí recibe transporte propio o de agencia (decisión 29: en toda ficha).
    expect(nearUnified(conFt, { city: "París", country: "FR", point: paris, provider: "freetour" }).items.map((i) => i.id)).toEqual(["par"]);
  });
  it("REQ-10750: el origen con país en minúsculas o con espacios casa igual", () => {
    expect(nearUnified(items, { city: null, country: " fr ", point: null }).items.map((i) => i.id)).toEqual(["par", "lyo"]);
  });
});

describe("transportAllowedFor", () => {
  it("REQ-10750: Kiwitaxi y cualquier afiliado nunca en FREETOUR; el transporte propio o de agencia sí en toda ficha", () => {
    expect(transportAllowedFor("freetour", { affiliate: true })).toBe(false);
    expect(transportAllowedFor("FREETOUR", { affiliate: true })).toBe(false);
    expect(transportAllowedFor("freetour", { affiliate: false })).toBe(true);
    expect(transportAllowedFor("tangol", { affiliate: true })).toBe(true);
    expect(transportAllowedFor(null, { affiliate: true })).toBe(true);
  });
});

describe("nearbyUnifiedEnabled", () => {
  it("REQ-10751: solo el texto exacto \"true\" enciende la bandera", () => {
    expect(nearbyUnifiedEnabled({ NEARBY_UNIFIED_ENABLED: "true" })).toBe(true);
    expect(nearbyUnifiedEnabled({ NEARBY_UNIFIED_ENABLED: "false" })).toBe(false);
    expect(nearbyUnifiedEnabled({ NEARBY_UNIFIED_ENABLED: "TRUE" })).toBe(false);
    expect(nearbyUnifiedEnabled({})).toBe(false);
  });
});
