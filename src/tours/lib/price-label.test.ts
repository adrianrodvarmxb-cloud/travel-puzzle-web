import { describe, it, expect } from "vitest";
import { tourPriceLabel } from "./price-label";

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
