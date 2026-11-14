import { describe, it, expect } from "vitest";
import { tourPriceLabel, priceLabelsFor } from "./price-label";

const rates = { USD: 18.5, EUR: 20.37, date: "05/11/2026" };

describe("REQ-170: precio de tour de pago en EUR con MXN aproximado (FREETOUR D4)", () => {
  it("REQ-170: EUR primero y la conversión a MXN marcada como aproximada (redondeo hacia arriba)", () => {
    expect(tourPriceLabel(25, "EUR", rates, "es")).toEqual({
      amount: 25, main: "EUR €25", approx: "aprox. MXN $510", note: "Se cobra en EUR; la conversión a pesos es aproximada y tu banco puede aplicar comisiones.",
    });
  });
  it("REQ-170: decimales y miles con idioma fijo (render determinista, INC-001)", () => {
    expect(tourPriceLabel(1234.5, "EUR", rates, "es")).toMatchObject({ main: "EUR €1,234.50", approx: "aprox. MXN $25,147" });
    expect(tourPriceLabel(25, "EUR", rates, "en")).toMatchObject({ approx: "approx. MXN $510" });
  });
  it("REQ-170: sin tipo de cambio queda solo EUR (sin inventar pesos), con la nota del cobro en EUR", () => {
    expect(tourPriceLabel(25, "EUR", null, "es")).toEqual({ amount: 25, main: "EUR €25", approx: null, note: "Se cobra en EUR; tu banco puede aplicar comisiones." });
  });
  it("REQ-170: free tour (precio 0) o moneda desconocida: sin etiqueta (la ficha queda como hoy)", () => {
    expect(tourPriceLabel(0, "EUR", rates, "es")).toBeNull();
    expect(tourPriceLabel(25, "GBP", rates, "es")).toBeNull();
    expect(tourPriceLabel(Number.NaN, "EUR", rates, "es")).toBeNull();
  });
});

describe("REQ-170: tarjetas de /tours y destacadas del inicio (EUR + MXN aprox., servidor)", () => {
  it("REQ-170: un mapa por id solo con los tours de pago; el free tour no lleva etiqueta", async () => {
    const { priceLabelsFor } = await import("./price-label");
    expect(priceLabelsFor([{ id: "a", price: 25, currency: "EUR" }, { id: "b", price: 0, currency: "EUR" }], rates, "es")).toEqual({
      a: { main: "EUR €25", approx: "aprox. MXN $510" },
    });
  });
  it("REQ-170: sin tipo de cambio, solo EUR; precio como texto (Decimal serializado) también sirve", async () => {
    const { priceLabelsFor } = await import("./price-label");
    expect(priceLabelsFor([{ id: "a", price: "12.5", currency: "EUR" }], null, "en")).toEqual({ a: { main: "EUR €12.50", approx: null } });
  });
});

describe("REQ-10510: un tour en USD (Tangol) se muestra con MXN aproximado igual que EUR, sin cambiar EUR", () => {
  it("REQ-10510: ficha: USD con el FIX de Banxico, hacia arriba al peso, y la nota no nombra al proveedor ni al neto", () => {
    const l = tourPriceLabel(22, "USD", rates, "es");
    expect(l).toEqual({ amount: 22, main: "USD $22", approx: "aprox. MXN $407", note: "La conversión a pesos es aproximada." });
    expect(JSON.stringify(l).toLowerCase()).not.toMatch(/tangol|neto|comisi/);
    expect(tourPriceLabel(22, "USD", rates, "en")?.approx).toBe("approx. MXN $407");
  });
  it("REQ-10510: sin tipo de cambio, solo USD (no se inventan pesos)", () => {
    expect(tourPriceLabel(22, "USD", null, "es")).toMatchObject({ main: "USD $22", approx: null });
  });
  it("REQ-10510: EUR queda exactamente como hoy", () => {
    expect(tourPriceLabel(25, "EUR", rates, "es")).toMatchObject({ main: "EUR €25", approx: "aprox. MXN $510" });
  });
  it("REQ-10510: el mapa por id incluye el tour en USD junto a los de EUR", () => {
    const labels = priceLabelsFor([{ id: "t1", price: 22, currency: "USD" }, { id: "t2", price: "25", currency: "EUR" }], rates, "es");
    expect(labels.t1).toEqual({ main: "USD $22", approx: "aprox. MXN $407" });
    expect(labels.t2).toEqual({ main: "EUR €25", approx: "aprox. MXN $510" });
  });
});
