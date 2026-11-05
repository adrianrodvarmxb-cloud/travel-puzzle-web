import { describe, it, expect } from "vitest";
import { chargeAmount, buildCheckoutParams, isStripeEnabled, sessionExpiry, MIN_CENTAVOS } from "./checkout";

const rates = { USD: 18.5, EUR: 20, date: "05/11/2026" };

describe("chargeAmount", () => {
  it("REQ-115: MXN se cobra tal cual, en centavos", () => {
    expect(chargeAmount(1250.5, "MXN", null, 3)).toEqual({ centavos: 125050, fxRate: null });
  });
  it("REQ-115: USD se convierte con FIX Banxico + colchón y sube al peso", () => {
    // 100 × 18.5 × 1.03 = 1905.5 → 1906 pesos
    expect(chargeAmount(100, "USD", rates, 3)).toEqual({ centavos: 190600, fxRate: 18.5 });
  });
  it("REQ-115: EUR usa su propio tipo de cambio", () => {
    // 50 × 20 × 1.03 = 1030
    expect(chargeAmount(50, "EUR", rates, 3)).toEqual({ centavos: 103000, fxRate: 20 });
  });
  it("REQ-115: sin tipo de cambio no hay monto", () => {
    expect(chargeAmount(100, "USD", null, 3)).toBeNull();
  });
  it("REQ-115: menos de $10 MXN o monto inválido se rechaza", () => {
    expect(chargeAmount(9.99, "MXN", null, 3)).toBeNull();
    expect(chargeAmount(-5, "MXN", null, 3)).toBeNull();
    expect(chargeAmount(Number.NaN, "MXN", null, 3)).toBeNull();
    expect(MIN_CENTAVOS).toBe(1000);
  });
});

describe("sessionExpiry", () => {
  it("REQ-116: el enlace vence a las 24 h (en segundos unix, sin pasarse del máximo de Stripe)", () => {
    const now = new Date("2026-11-05T17:00:00Z");
    const exp = sessionExpiry(now);
    const diff = exp - Math.floor(now.getTime() / 1000);
    expect(diff).toBeLessThanOrEqual(24 * 3600);
    expect(diff).toBeGreaterThan(24 * 3600 - 120);
  });
});

describe("buildCheckoutParams", () => {
  const base = {
    paymentId: "pay_1", requestId: "req_1", ref: "TP-ABC", tripTitle: "Machu Picchu 2D", kind: "anticipo" as const,
    centavos: 190600, email: "cliente@example.com", siteUrl: "https://travelpuzzle.com.mx", expiresAt: 1800000000,
  };
  it("REQ-114: Checkout en pesos, solo tarjeta, con metadatos para el webhook", () => {
    const p = buildCheckoutParams(base);
    expect(p["mode"]).toBe("payment");
    expect(p["payment_method_types[0]"]).toBe("card");
    expect(p["payment_method_types[1]"]).toBeUndefined();
    expect(p["line_items[0][price_data][currency]"]).toBe("mxn");
    expect(p["line_items[0][price_data][unit_amount]"]).toBe("190600");
    expect(p["line_items[0][quantity]"]).toBe("1");
    expect(p["line_items[0][price_data][product_data][name]"]).toBe("Anticipo · Machu Picchu 2D (TP-ABC)");
    expect(p["customer_email"]).toBe("cliente@example.com");
    expect(p["client_reference_id"]).toBe("pay_1");
    expect(p["metadata[payment_id]"]).toBe("pay_1");
    expect(p["metadata[request_id]"]).toBe("req_1");
    expect(p["metadata[kind]"]).toBe("anticipo");
    expect(p["locale"]).toBe("es");
    expect(p["expires_at"]).toBe("1800000000");
    expect(p["success_url"]).toBe("https://travelpuzzle.com.mx/?pago=recibido&ref=TP-ABC");
    expect(p["cancel_url"]).toBe("https://travelpuzzle.com.mx/");
  });
  it("REQ-114: nombre del concepto según el tipo", () => {
    expect(buildCheckoutParams({ ...base, kind: "liquidacion" })["line_items[0][price_data][product_data][name]"]).toMatch(/^Liquidación · /);
    expect(buildCheckoutParams({ ...base, kind: "total" })["line_items[0][price_data][product_data][name]"]).toMatch(/^Pago total · /);
  });
});

describe("isStripeEnabled", () => {
  it("REQ-118: solo \"true\" enciende", () => {
    expect(isStripeEnabled("true")).toBe(true);
    expect(isStripeEnabled("false")).toBe(false);
    expect(isStripeEnabled(undefined)).toBe(false);
    expect(isStripeEnabled("TRUE")).toBe(false);
  });
});
