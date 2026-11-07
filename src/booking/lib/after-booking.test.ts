import { describe, expect, it } from "vitest";
import { needsCheckout, nextStepAfterBooking } from "./after-booking";

describe("nextStepAfterBooking", () => {
  it("REQ-011: tour de pago → ir al checkout (solo https)", () => {
    expect(nextStepAfterBooking({ paymentUrl: "https://checkout.stripe.com/c/pay/x" })).toEqual({ kind: "pay", url: "https://checkout.stripe.com/c/pay/x" });
  });
  it("REQ-011: free tour (o URL no segura) → confirmación en la página", () => {
    expect(nextStepAfterBooking({})).toEqual({ kind: "confirmed" });
    expect(nextStepAfterBooking({ paymentUrl: "http://x" })).toEqual({ kind: "confirmed" });
    expect(nextStepAfterBooking({ paymentUrl: "javascript:alert(1)" })).toEqual({ kind: "confirmed" });
  });
});

// REQ-938 (D7): pago a la llegada (payNow 0) no pide checkout; depósito o pago completo sí.
describe("REQ-938 needsCheckout", () => {
  it("REQ-938: free tour → no", () => expect(needsCheckout({ isPaid: false, payNow: 0 })).toBe(false));
  it("REQ-938: pago a la llegada → no", () => expect(needsCheckout({ isPaid: true, payNow: 0 })).toBe(false));
  it("REQ-938: depósito o total → sí", () => expect(needsCheckout({ isPaid: true, payNow: 12 })).toBe(true));
});
