import { describe, it, expect } from "vitest";
import { zFTEventDetail } from "@/lib/api/schemas/FTEvent.Schema";
import { checkEvent } from "./event-check";
import { paidTerms } from "./paid-price";

// Respuesta real de GET /event/631716698 en v2.2 (prueba de REQ-063, 12 nov 2026).
const real = {
  id: 631716698, isAvailable: 1, minAdultsPerBooking: 1, availableAdultPlaces: 5, availableChildrenPlaces: 3,
  isPhoneRequired: 0, fullPricePerGroup: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
  payableNowPricePerGroup: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }, isPartiallyPaid: 0,
};
const paid = { ...real, fullPricePerGroup: { "1": 30, "2": 60 }, payableNowPricePerGroup: { "1": 10, "2": 20 }, isPartiallyPaid: 1 };

describe("REQ-064: evento v2.2 (precio y campos nuevos)", () => {
  it("REQ-064: el evento real de v2.2 pasa la validación Zod", () => {
    expect(zFTEventDetail.safeParse(real).success).toBe(true);
  });

  it("REQ-064: un evento sin los campos nuevos se rechaza (no llega al cliente)", () => {
    const { payableNowPricePerGroup: _p, minAdultsPerBooking: _m, ...viejo } = real;
    expect(zFTEventDetail.safeParse(viejo).success).toBe(false);
  });

  it("REQ-064: lo que se cobra hoy sale de payableNowPricePerGroup", () => {
    const check = checkEvent(zFTEventDetail.parse(paid), { adults: 2, children: 0, hasPhone: false });
    expect(check).toEqual({ ok: true, price: 60 });
    const terms = paidTerms(zFTEventDetail.parse(paid), 2, 0, 60);
    expect(terms).toMatchObject({ ok: true, isPaid: true, isPartial: true, fullPrice: 60, payNow: 20 });
  });

  it("REQ-064: salida no disponible, sin cupo o bajo el mínimo de adultos no se reserva", () => {
    const ev = zFTEventDetail.parse(real);
    expect(checkEvent({ ...ev, isAvailable: false }, { adults: 1, children: 0, hasPhone: false })).toEqual({ ok: false, code: "no_availability" });
    expect(checkEvent(ev, { adults: 6, children: 0, hasPhone: false })).toEqual({ ok: false, code: "no_availability" });
    expect(checkEvent(ev, { adults: 1, children: 4, hasPhone: false })).toEqual({ ok: false, code: "no_availability" });
    expect(checkEvent({ ...ev, minAdultsPerBooking: 2 }, { adults: 1, children: 0, hasPhone: false })).toEqual({ ok: false, code: "no_availability" });
  });

  it("REQ-064: teléfono obligatorio cuando el evento lo pide", () => {
    const ev = zFTEventDetail.parse({ ...real, isPhoneRequired: 1 });
    expect(checkEvent(ev, { adults: 1, children: 0, hasPhone: false })).toEqual({ ok: false, code: "phone_required" });
    expect(checkEvent(ev, { adults: 1, children: 0, hasPhone: true })).toEqual({ ok: true, price: 0 });
  });
});
