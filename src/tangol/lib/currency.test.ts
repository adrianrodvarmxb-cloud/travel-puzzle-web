import { describe, it, expect } from "vitest";
import { normalizeCurrency, TANGOL_CURRENCY_CODES } from "./currency";

describe("REQ-10543: la moneda que devuelve Tangol se normaliza con un mapa explícito", () => {
  it("REQ-10543: el código numérico 1 (número o texto) es USD", () => {
    expect(TANGOL_CURRENCY_CODES).toEqual({ "1": "USD" });
    expect(normalizeCurrency("1")).toBe("USD");
    expect(normalizeCurrency(1)).toBe("USD");
    expect(normalizeCurrency(" 1 ")).toBe("USD");
  });
  it("REQ-10543: los ISO de 3 letras que ya llegan pasan tal cual, en mayúsculas", () => {
    expect(normalizeCurrency("USD")).toBe("USD");
    expect(normalizeCurrency("ars")).toBe("ARS");
    expect(normalizeCurrency(" eur ")).toBe("EUR");
  });
  it("REQ-10543: cualquier otro código NO se adivina (null)", () => {
    for (const v of ["2", 0, 2, "US", "DOLAR", "U$S", "12", ""]) expect(normalizeCurrency(v), String(v)).toBeNull();
    expect(normalizeCurrency(null)).toBeNull();
    expect(normalizeCurrency(undefined)).toBeNull();
  });
});
