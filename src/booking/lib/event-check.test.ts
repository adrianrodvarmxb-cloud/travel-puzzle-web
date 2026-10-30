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
