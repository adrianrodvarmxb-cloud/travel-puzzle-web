import { describe, it, expect } from "vitest";
import { isHoldEnabled, holdApplies, safeCheckoutUrl } from "./hold";

describe("isHoldEnabled", () => {
  it("REQ-3482: solo 'true' enciende la retención", () => {
    expect(isHoldEnabled("true")).toBe(true);
    expect(isHoldEnabled("false")).toBe(false);
    expect(isHoldEnabled(undefined)).toBe(false);
    expect(isHoldEnabled("1")).toBe(false);
  });
});

describe("holdApplies", () => {
  const base = { holdFlag: "true", stripeFlag: "true", kind: "reserva", estimate: 5000 };
  it("REQ-3482: con ambas banderas, reserva y precio conocido → retiene", () => {
    expect(holdApplies(base)).toBe(true);
  });
  it("REQ-3482: sin STRIPE_HOLD_ENABLED no retiene (todo sigue como hoy)", () => {
    expect(holdApplies({ ...base, holdFlag: "false" })).toBe(false);
    expect(holdApplies({ ...base, holdFlag: undefined })).toBe(false);
  });
  it("REQ-3482: sin STRIPE_ENABLED no retiene aunque la de retención esté encendida", () => {
    expect(holdApplies({ ...base, stripeFlag: "false" })).toBe(false);
  });
  it("REQ-3482: viaje personalizado o precio por confirmar (sin estimado) no retiene", () => {
    expect(holdApplies({ ...base, kind: "personalizado" })).toBe(false);
    expect(holdApplies({ ...base, estimate: null })).toBe(false);
    expect(holdApplies({ ...base, estimate: 0 })).toBe(false);
    expect(holdApplies({ ...base, estimate: Number.NaN })).toBe(false);
  });
});

describe("safeCheckoutUrl", () => {
  it("REQ-3482: solo acepta enlaces https de checkout.stripe.com", () => {
    expect(safeCheckoutUrl("https://checkout.stripe.com/c/pay/cs_1")).toBe("https://checkout.stripe.com/c/pay/cs_1");
    expect(safeCheckoutUrl("http://checkout.stripe.com/c/pay/cs_1")).toBeNull();
    expect(safeCheckoutUrl("https://checkout.stripe.com.evil.com/x")).toBeNull();
    expect(safeCheckoutUrl("javascript:alert(1)")).toBeNull();
    expect(safeCheckoutUrl(undefined)).toBeNull();
  });
});
