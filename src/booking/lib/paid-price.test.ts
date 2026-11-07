import { describe, expect, it } from "vitest";
import { groupIsPaid, paidTerms, pricesFor } from "./paid-price";

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

// REQ-930: une REQ-810 (precio conservador del grupo, en main) con REQ-010 (lo que se cobra hoy y niños).
describe("REQ-930 paidTerms", () => {
  const table = { fullPricePerGroup: { "1": 0, "4": 0, "5": 40, "6": 48 }, payableNowPricePerGroup: { "5": 10, "6": 12 }, isPartiallyPaid: true };
  it("REQ-930: precio del grupo 0 → free tour (acepta niños, no cobra)", () => {
    expect(paidTerms(table, 4, 2, 0)).toEqual({ ok: true, isPaid: false, isPartial: false, fullPrice: 0, payNow: 0 });
  });
  it("REQ-930: de pago con niños → children_not_allowed (nunca se reserva gratis)", () => {
    expect(paidTerms(table, 4, 1, 40)).toEqual({ ok: false, code: "children_not_allowed" });
  });
  it("REQ-930: depósito (isPartiallyPaid): se cobra hoy payableNow", () => {
    expect(paidTerms(table, 6, 0, 48)).toEqual({ ok: true, isPaid: true, isPartial: true, fullPrice: 48, payNow: 12 });
  });
  it("REQ-930: sin payableNow para el grupo → se cobra el total", () => {
    expect(paidTerms({ ...table, payableNowPricePerGroup: {} }, 5, 0, 40)).toEqual({ ok: true, isPaid: true, isPartial: false, fullPrice: 40, payNow: 40 });
  });
  it("REQ-930: pago a la llegada (payableNow 0) se respeta (D7)", () => {
    expect(paidTerms({ ...table, payableNowPricePerGroup: { "5": 0 }, isPartiallyPaid: false }, 5, 0, 40)).toEqual({ ok: true, isPaid: true, isPartial: false, fullPrice: 40, payNow: 0 });
  });
});

// REQ-935: el formulario sabe si el grupo paga con la misma lectura conservadora que el servidor (REQ-810).
describe("REQ-935 groupIsPaid", () => {
  const t = { "1": 0, "4": 0, "5": 40 };
  it("REQ-935: por adultos o por adultos + niños, la más cara", () => {
    expect(groupIsPaid(t, 5, 0)).toBe(true);
    expect(groupIsPaid(t, 4, 1)).toBe(true);
    expect(groupIsPaid(t, 4, 0)).toBe(false);
  });
  it("REQ-935: sin tabla → free", () => {
    expect(groupIsPaid(undefined, 2, 0)).toBe(false);
  });
});
