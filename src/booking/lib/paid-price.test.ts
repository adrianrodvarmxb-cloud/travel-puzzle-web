import { describe, expect, it } from "vitest";
import { pricesFor } from "./paid-price";

// Ejemplo del PDF de la API v2.0: gratis de 1 a 4 adultos; de pago desde 5 (pago parcial).
const ev = { fullPricePerGroup: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 100, "6": 120 }, payableNowPricePerGroup: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 20, "6": 24 }, isPartiallyPaid: true };

describe("pricesFor", () => {
  it("REQ-010: la llave es el número de ADULTOS (no adultos + niños)", () => {
    expect(pricesFor(ev, 2, 0)).toEqual({ ok: true, isPaid: false, isPartial: false, fullPrice: 0, payNow: 0 });
    expect(pricesFor(ev, 5, 0)).toMatchObject({ ok: true, isPaid: true, fullPrice: 100 });
  });
  it("REQ-010: lo que se cobra hoy sale de payableNowPricePerGroup", () => {
    expect(pricesFor(ev, 6, 0)).toEqual({ ok: true, isPaid: true, isPartial: true, fullPrice: 120, payNow: 24 });
  });
  it("REQ-010: un tour de pago no acepta niños (error 45 de Freetour)", () => {
    expect(pricesFor(ev, 5, 1)).toEqual({ ok: false, code: "children_not_allowed" });
  });
  it("REQ-010: un free tour sí acepta niños", () => {
    expect(pricesFor(ev, 2, 2)).toMatchObject({ ok: true, isPaid: false });
  });
  it("REQ-010: sin precio para ese grupo no se reserva", () => {
    expect(pricesFor(ev, 9, 0)).toEqual({ ok: false, code: "no_price" });
  });
  it("REQ-010: pago completo (no parcial): payNow = precio total", () => {
    const full = { fullPricePerGroup: { "1": 30 }, payableNowPricePerGroup: { "1": 30 }, isPartiallyPaid: false };
    expect(pricesFor(full, 1, 0)).toEqual({ ok: true, isPaid: true, isPartial: false, fullPrice: 30, payNow: 30 });
  });
  it("REQ-010: free tour sin tabla de precios", () => {
    expect(pricesFor({ fullPricePerGroup: {}, payableNowPricePerGroup: {}, isPartiallyPaid: false }, 3, 1)).toEqual({ ok: true, isPaid: false, isPartial: false, fullPrice: 0, payNow: 0 });
  });
});
