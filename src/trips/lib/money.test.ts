import { describe, it, expect } from "vitest";
import { optionPrice, toMXN, formatMoney, priceDisplay } from "./money";

const rates = { USD: 18.45, EUR: 20.1, date: "03/11/2026" };

describe("money", () => {
  it("convierte a pesos y redondea hacia arriba al peso", () => {
    expect(toMXN(100, "USD", rates)).toBe(1845);
    expect(toMXN(99.99, "EUR", rates)).toBe(2010);
    expect(toMXN(450, "MXN", rates)).toBe(450);
    expect(toMXN(100, "USD", null)).toBeNull();
  });
  it("formato con símbolo y separadores", () => {
    expect(formatMoney(45900, "MXN", "es")).toBe("MXN $45,900");
    expect(formatMoney(2490, "USD", "en")).toBe("USD $2,490");
    expect(formatMoney(1234.5, "EUR", "es")).toBe("EUR €1,234.50");
  });
  it("precio principal en pesos y el original al lado (gate E)", () => {
    expect(priceDisplay(2490, "USD", rates, "es")).toEqual({ main: "MXN $45,941", original: "USD $2,490", rateNote: "Tipo de cambio FIX Banxico 03/11/2026: 18.45" });
    expect(priceDisplay(450, "MXN", rates, "es")).toEqual({ main: "MXN $450", original: null, rateNote: null });
    expect(priceDisplay(2490, "USD", null, "es")).toEqual({ main: "USD $2,490", original: null, rateNote: "Pagadero en pesos al tipo de cambio del día" });
    expect(priceDisplay(null, "USD", rates, "es")).toBeNull();
  });
});

describe("REQ-112 precio de opciones en moneda original", () => {
  const fx = { USD: 18.2, EUR: 20, date: "2026-11-05" };
  it("REQ-112: USD primero y pesos aproximados al lado", () => {
    expect(optionPrice(3684, "USD", fx, "es")).toBe("USD $3,684 (aprox. MXN $67,049)");
    expect(optionPrice(3684, "USD", fx, "en")).toBe("USD $3,684 (approx. MXN $67,049)");
  });
  it("REQ-112: sin tipo de cambio solo la moneda original; en pesos, solo pesos", () => {
    expect(optionPrice(3684, "USD", null, "es")).toBe("USD $3,684");
    expect(optionPrice(1500, "MXN", fx, "es")).toBe("MXN $1,500");
  });
});
