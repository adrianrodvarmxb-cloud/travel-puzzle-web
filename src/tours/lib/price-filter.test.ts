/**
 * REQ-1254 / REQ-1255 (INC-008; docs/taxonomia.md §4.3 y Taxonomia.docx §6: «Precio: propina o deslizador por rango
 * (EUR con MXN aproximado)»): el rango de precio de /tours habla en la moneda con la que filtra (EUR, la del proveedor),
 * con MXN aproximado como las tarjetas; nunca «US$».
 */
import { describe, expect, it } from "vitest";
import { PRICE_FILTER_CURRENCY, priceInEur, priceStopLabel } from "./price-filter";
import { matchesToursFilter } from "@/trips/lib/public";
import { readFileSync } from "node:fs";

const fx = { USD: 18, EUR: 20, date: "2026-11-07" };

describe("REQ-1254 el deslizador de precio dice EUR con MXN aproximado", () => {
  it("REQ-1254 etiquetas deterministas (sin Intl), con «+» en el tope", () => {
    expect(PRICE_FILTER_CURRENCY).toBe("EUR");
    expect(priceStopLabel(0, false, null, "es")).toBe("€0");
    expect(priceStopLabel(25, false, 20, "es")).toBe("€25 · aprox. MXN $500");
    expect(priceStopLabel(2000, true, 20, "es")).toBe("€2,000+ · aprox. MXN $40,000+");
    expect(priceStopLabel(1000, false, 20.37, "en")).toBe("€1,000 · approx. MXN $20,370");
    expect(priceStopLabel(500, false, null, "en")).toBe("€500");
  });
  it("REQ-1254 el componente ya no dice «US$»", () => {
    const src = readFileSync("src/components/tours/filters/PriceSlider.tsx", "utf8");
    expect(src).not.toMatch(/US\$/);
    expect(src).toContain("priceStopLabel");
  });
});

describe("REQ-1255 los viajes en USD o MXN se comparan en EUR", () => {
  it("REQ-1255 conversión con el tipo de cambio del día; sin tipo de cambio, el monto tal cual", () => {
    expect(priceInEur(100, "USD", fx)).toBe(90);
    expect(priceInEur(100, "EUR", fx)).toBe(100);
    expect(priceInEur(2000, "MXN", fx)).toBe(100);
    expect(priceInEur(100, "USD", null)).toBe(100);
    expect(priceInEur(null, "USD", fx)).toBeNull();
  });
  it("REQ-1255 el filtro usa el precio en EUR del viaje", () => {
    const t = { countries: ["PE"], kind: "tour" as const, priceFrom: 100, priceFromEur: 90 };
    expect(matchesToursFilter(t, { countryCode: null, kind: "all", maxPrice: 95 })).toBe(true);
    expect(matchesToursFilter(t, { countryCode: null, kind: "all", minPrice: 95 })).toBe(false);
    expect(matchesToursFilter({ countries: ["PE"], kind: "tour" as const, priceFrom: 100 }, { countryCode: null, kind: "all", maxPrice: 95 })).toBe(false);
  });
  it("REQ-1255 la tarjeta del viaje trae su precio en EUR", () => {
    const src = readFileSync("src/trips/public-load.ts", "utf8");
    expect(src).toMatch(/priceFromEur: priceInEur\(t\.priceFrom, t\.currency, fx\)/);
  });
});
