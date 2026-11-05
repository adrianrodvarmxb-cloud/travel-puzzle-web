import { describe, it, expect } from "vitest";
import { sellPrice, sellTiers, type MarkupRates } from "./markup";

// Porcentajes de prueba (los reales no viven en el repo).
const R: MarkupRates = { pct: { programa: 0.1, tour: 0.5, privado: 0.2, traslado: 0.4 }, minTourUsd: 7 };

describe("REQ-038 sellPrice", () => {
  it("REQ-038: programa aplica su porcentaje y redondea hacia arriba sin error de coma flotante", () => {
    expect(sellPrice(1000, { kind: "programa" }, R)).toBe(1100);
    expect(sellPrice(455.5, { kind: "programa" }, R)).toBe(502); // 501.05
    expect(sellPrice(1720, { kind: "programa" }, { ...R, pct: { ...R.pct, programa: 0.2 } })).toBe(2064);
  });

  it("REQ-038: programa nunca queda por debajo del precio publicado del operador", () => {
    expect(sellPrice(1000, { kind: "programa", published: 1300 }, R)).toBe(1300);
    expect(sellPrice(1000, { kind: "programa", published: 1050 }, R)).toBe(1100);
  });

  it("REQ-038: tour respeta el mínimo en USD sobre el neto", () => {
    expect(sellPrice(100, { kind: "tour" }, R)).toBe(150);
    expect(sellPrice(6, { kind: "tour" }, R)).toBe(13); // 9 < 6+7
  });

  it("REQ-038: privado y traslado usan su propio porcentaje", () => {
    expect(sellPrice(185, { kind: "privado" }, R)).toBe(222);
    expect(sellPrice(40, { kind: "traslado" }, R)).toBe(56);
  });

  it("REQ-038: rechaza netos o márgenes inválidos", () => {
    expect(() => sellPrice(0, { kind: "tour" }, R)).toThrow();
    expect(() => sellPrice(Number.NaN, { kind: "tour" }, R)).toThrow();
    expect(() => sellPrice(10, { kind: "tour" }, { ...R, pct: { ...R.pct, tour: -1 } })).toThrow();
  });

  it("REQ-038: sellTiers aplica el margen a cada rango de pasajeros", () => {
    expect(sellTiers([{ label: "1-2", net: 185 }, { label: "3-4", net: 115 }], { kind: "privado" }, R)).toEqual([
      { label: "1-2", net: 185, sell: 222 },
      { label: "3-4", net: 115, sell: 138 },
    ]);
  });
});
