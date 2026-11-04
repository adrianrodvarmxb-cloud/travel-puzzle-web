import { describe, expect, it } from "vitest";
import { nextStepAfterBooking } from "./after-booking";

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
