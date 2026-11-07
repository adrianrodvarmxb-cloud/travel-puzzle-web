import { describe, it, expect } from "vitest";
import { checkEvent } from "./event-check";

const ev = { id: 1, isAvailable: true, minAdultsPerBooking: 1, availableAdultPlaces: 10, availableChildrenPlaces: 5, isPhoneRequired: false, fullPricePerGroup: {}, payableNowPricePerGroup: {}, isPartiallyPaid: false };

describe("checkEvent", () => {
  it("free tour sin precios: precio 0 y se puede reservar", () => {
    expect(checkEvent(ev, { adults: 2, children: 0, hasPhone: false })).toEqual({ ok: true, price: 0 });
  });
  it("el precio sale de Freetour según el tamaño del grupo, no del navegador", () => {
    const paid = { ...ev, fullPricePerGroup: { "1": 25, "2": 50 } };
    expect(checkEvent(paid, { adults: 2, children: 0, hasPhone: false })).toEqual({ ok: true, price: 50 });
  });
  it("precios en cero cuentan como free tour", () => {
    expect(checkEvent({ ...ev, fullPricePerGroup: { "2": 0 } }, { adults: 2, children: 0, hasPhone: false })).toEqual({ ok: true, price: 0 });
  });
  it("tour de pago sin precio para ese grupo: no se reserva", () => {
    const paid = { ...ev, fullPricePerGroup: { "1": 25 } };
    expect(checkEvent(paid, { adults: 3, children: 0, hasPhone: false })).toEqual({ ok: false, code: "no_availability" });
  });
  it("sin lugares, no disponible o menos del mínimo: no_availability", () => {
    expect(checkEvent({ ...ev, isAvailable: false }, { adults: 1, children: 0, hasPhone: false }).ok).toBe(false);
    expect(checkEvent({ ...ev, availableAdultPlaces: 1 }, { adults: 2, children: 0, hasPhone: false }).ok).toBe(false);
    expect(checkEvent({ ...ev, availableChildrenPlaces: 0 }, { adults: 1, children: 1, hasPhone: false }).ok).toBe(false);
    expect(checkEvent({ ...ev, minAdultsPerBooking: 2 }, { adults: 1, children: 0, hasPhone: false }).ok).toBe(false);
  });
  it("si Freetour exige teléfono y no lo dieron: phone_required", () => {
    expect(checkEvent({ ...ev, isPhoneRequired: true }, { adults: 1, children: 0, hasPhone: false })).toEqual({ ok: false, code: "phone_required" });
  });
});

// REQ-810 (D2, E9): la tabla de precios se lee por adultos (formulario y PR #62, REQ-010) o por adultos + niños
// (servidor). Hasta que api@freetour.com lo confirme, el servidor toma la lectura más cara: nunca reserva gratis
// un grupo que alguna de las dos lecturas marca como de pago.
describe("REQ-810 umbral por evento: lectura conservadora de fullPricePerGroup", () => {
  const table = { ...ev, fullPricePerGroup: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 40, "6": 48 } };
  it("REQ-810: 5 adultos y 0 niños → de pago (40)", () => {
    expect(checkEvent(table, { adults: 5, children: 0, hasPhone: false })).toEqual({ ok: true, price: 40 });
  });
  it("REQ-810: 4 adultos y 1 niño → de pago (la lectura por grupo marca 40), no gratis", () => {
    expect(checkEvent(table, { adults: 4, children: 1, hasPhone: false })).toEqual({ ok: true, price: 40 });
  });
  it("REQ-810: si por adultos es de pago aunque la clave del grupo falte → de pago, no «sin lugares»", () => {
    const t = { ...ev, fullPricePerGroup: { "1": 0, "2": 30 } };
    expect(checkEvent(t, { adults: 2, children: 1, hasPhone: false })).toEqual({ ok: true, price: 30 });
  });
  it("REQ-810: 3 adultos y 1 niño, ambas lecturas en 0 → gratis", () => {
    expect(checkEvent(table, { adults: 3, children: 1, hasPhone: false })).toEqual({ ok: true, price: 0 });
  });
  it("REQ-810: sin ninguna de las dos claves → no_availability", () => {
    expect(checkEvent({ ...ev, fullPricePerGroup: { "1": 25 } }, { adults: 3, children: 0, hasPhone: false })).toEqual({ ok: false, code: "no_availability" });
  });
  it("REQ-810: respeta minAdultsPerBooking, plazas e isPhoneRequired antes del precio", () => {
    expect(checkEvent({ ...table, minAdultsPerBooking: 6 }, { adults: 5, children: 0, hasPhone: false })).toEqual({ ok: false, code: "no_availability" });
    expect(checkEvent({ ...table, availableChildrenPlaces: 0 }, { adults: 2, children: 1, hasPhone: false })).toEqual({ ok: false, code: "no_availability" });
    expect(checkEvent({ ...table, isPhoneRequired: true }, { adults: 5, children: 0, hasPhone: false })).toEqual({ ok: false, code: "phone_required" });
  });
});
