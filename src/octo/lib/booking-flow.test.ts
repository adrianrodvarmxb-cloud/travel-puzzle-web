import { describe, it, expect } from "vitest";
import { deliverables, holdState, mustReleaseHold } from "./booking-flow";
import { bookingSchema } from "./schemas";
import { sampleBooking } from "./fixtures";

const bk = (over: Record<string, unknown> = {}) => bookingSchema.parse(sampleBooking(over));
const now = Date.parse("2026-11-12T10:10:00Z");

describe("apartar → pagar → confirmar", () => {
  it("REQ-3328: un apartado vigente se puede confirmar; vencido o no apartado, no", () => {
    expect(holdState(bk({ status: "ON_HOLD", utcExpiresAt: "2026-11-12T10:30:00Z" }), now)).toBe("confirmable");
    expect(holdState(bk({ status: "ON_HOLD", utcExpiresAt: "2026-11-12T10:00:00Z" }), now)).toBe("expired");
    expect(holdState(bk({ status: "CONFIRMED" }), now)).toBe("not-on-hold");
  });

  it("REQ-3328: un apartado sin pago se libera por API", () => {
    expect(mustReleaseHold(bk({ status: "ON_HOLD" }), false)).toBe(true);
    expect(mustReleaseHold(bk({ status: "ON_HOLD" }), true)).toBe(false);
    expect(mustReleaseHold(bk({ status: "CONFIRMED" }), false)).toBe(false);
  });
});

describe("entrega al cliente", () => {
  it("REQ-3328: VOUCHER = un código por reserva, con la referencia de Big Bus", () => {
    const d = deliverables(bk());
    expect(d.supplierReference).toBe("BB-K3RM568F");
    expect(d.items).toEqual([{ kind: "voucher", qr: "BB-K3RM568F", pdfUrl: "https://example.test/voucher.pdf" }]);
  });

  it("REQ-3328: TICKET = un código por persona; solo se entrega el método que trae la reserva", () => {
    const d = deliverables(bk({ deliveryMethods: ["TICKET"] }));
    expect(d.items.map((i) => [i.kind, i.qr])).toEqual([
      ["ticket", "T-1"],
      ["ticket", "T-2"],
    ]);
  });

  it("REQ-3328: sin confirmar no se entrega nada", () => {
    expect(deliverables(bk({ status: "ON_HOLD" })).items).toEqual([]);
    expect(deliverables(bk({ status: "CANCELLED" })).items).toEqual([]);
  });
});
