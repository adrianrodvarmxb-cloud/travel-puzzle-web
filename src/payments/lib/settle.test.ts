import { describe, it, expect } from "vitest";
import { decideCapture, PO_APPROVAL_CENTAVOS, type HeldRequest, type ProviderConfirmation } from "./settle";

const held: HeldRequest = { date: "2026-12-10", adults: 2, children: 1, infants: 0, amount: 1500, currency: "USD", heldCentavos: 780000 };
const conf: ProviderConfirmation = { date: "2026-12-10", adults: 2, children: 1, infants: 0, amount: 1500, currency: "USD" };

describe("decideCapture", () => {
  it("REQ-3483: el tope para pedir OK al PO es $20,000 MXN", () => {
    expect(PO_APPROVAL_CENTAVOS).toBe(2_000_000);
  });
  it("REQ-3483: misma fecha, personas y precio, y menos de $20,000 → cobra sola", () => {
    expect(decideCapture(held, conf, false)).toEqual({ action: "capture" });
  });
  it("REQ-3483: fecha distinta → pide OK al PO", () => {
    expect(decideCapture(held, { ...conf, date: "2026-12-11" }, false)).toEqual({ action: "needs_po", reasons: ["date_changed"] });
  });
  it("REQ-3483: personas distintas (adultos, niños o infantes) → pide OK al PO", () => {
    expect(decideCapture(held, { ...conf, adults: 3 }, false)).toEqual({ action: "needs_po", reasons: ["people_changed"] });
    expect(decideCapture(held, { ...conf, children: 0 }, false).action).toBe("needs_po");
    expect(decideCapture(held, { ...conf, infants: 1 }, false).action).toBe("needs_po");
  });
  it("REQ-3483: precio o moneda distintos → pide OK al PO", () => {
    expect(decideCapture(held, { ...conf, amount: 1600 }, false)).toEqual({ action: "needs_po", reasons: ["price_changed"] });
    expect(decideCapture(held, { ...conf, currency: "EUR" }, false).action).toBe("needs_po");
  });
  it("REQ-3483: confirmación ambigua → pide OK al PO aunque todo coincida", () => {
    expect(decideCapture(held, { ...conf, ambiguous: true }, false)).toEqual({ action: "needs_po", reasons: ["ambiguous"] });
  });
  it("REQ-3483: $20,000 MXN o más pide OK al PO aunque todo coincida; $19,999.99 no", () => {
    expect(decideCapture({ ...held, heldCentavos: 2_000_000 }, conf, false)).toEqual({ action: "needs_po", reasons: ["amount_over_limit"] });
    expect(decideCapture({ ...held, heldCentavos: 1_999_999 }, conf, false)).toEqual({ action: "capture" });
  });
  it("REQ-3483: junta todos los motivos", () => {
    const r = decideCapture({ ...held, heldCentavos: 2_500_000 }, { ...conf, date: "2026-12-12", amount: 1 }, false);
    expect(r).toEqual({ action: "needs_po", reasons: ["date_changed", "price_changed", "amount_over_limit"] });
  });
  it("REQ-3483: con el OK del PO cobra aunque haya motivos", () => {
    expect(decideCapture({ ...held, heldCentavos: 2_500_000 }, { ...conf, date: "2026-12-12" }, true)).toEqual({ action: "capture" });
  });
});
