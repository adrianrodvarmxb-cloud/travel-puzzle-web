import { describe, it, expect } from "vitest";
import { formatCurrencyReport } from "./currency-report";

describe("REQ-10510: la moneda devuelta por Tangol se ve en el resumen del sync", () => {
  it("REQ-10510: dice la pedida y cuenta las devueltas, de mayor a menor", () => {
    expect(formatCurrencyReport({ monedaPedida: "USD", monedas: { USD: 1179 } })).toBe("Moneda pedida a Tangol: USD · devuelta: USD×1179");
    expect(formatCurrencyReport({ monedaPedida: "USD", monedas: { ARS: 2, USD: 1179 } })).toMatch(/^Moneda pedida a Tangol: USD · devuelta: USD×1179, ARS×2 · ::warning::/);
  });
  it("REQ-10510: sin tarifas leídas lo dice", () => {
    expect(formatCurrencyReport({ monedaPedida: "USD", monedas: {} })).toBe("Moneda pedida a Tangol: USD · devuelta: (sin tarifas leídas)");
  });
  it("REQ-10510: avisa cuando Tangol devolvió otra moneda que la pedida", () => {
    expect(formatCurrencyReport({ monedaPedida: "USD", monedas: { ARS: 5 } })).toBe("Moneda pedida a Tangol: USD · devuelta: ARS×5 · ::warning::Tangol devolvió otra moneda que la pedida");
  });
});
