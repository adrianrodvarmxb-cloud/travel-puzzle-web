import { describe, it, expect, vi } from "vitest";
import { createStripeClient } from "./stripe-client";

function client(res: { ok?: boolean; status?: number; json?: unknown } = {}) {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => ({ ok: res.ok ?? true, status: res.status ?? 200, json: async () => res.json ?? { id: "pi_1", status: "succeeded" } }) as unknown as Response);
  return { fetch, stripe: createStripeClient({ secretKey: "sk_test_x", fetch }) };
}

describe("cliente de Stripe: cobrar y liberar una retención", () => {
  it("REQ-3483: capturar manda el monto a capturar y una llave de idempotencia", async () => {
    const { fetch, stripe } = client();
    await stripe.capturePaymentIntent("pi_1", 150000, "capture_pay_1");
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.stripe.com/v1/payment_intents/pi_1/capture");
    expect(String(init.body)).toBe("amount_to_capture=150000");
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("capture_pay_1");
  });
  it("REQ-3483: liberar cancela el PaymentIntent con su llave de idempotencia", async () => {
    const { fetch, stripe } = client();
    await stripe.cancelPaymentIntent("pi_1", "release_pay_1");
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.stripe.com/v1/payment_intents/pi_1/cancel");
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("release_pay_1");
  });
  it("REQ-3483: un error de Stripe lanza con su mensaje", async () => {
    const { stripe } = client({ ok: false, status: 400, json: { error: { message: "ya capturado" } } });
    await expect(stripe.capturePaymentIntent("pi_1", 1000, "k")).rejects.toThrow("Stripe 400: ya capturado");
  });
  it("REQ-159: crear una sesión sigue sin llave de idempotencia", async () => {
    const { fetch, stripe } = client({ json: { id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" } });
    await stripe.createCheckoutSession({ mode: "payment" });
    expect((fetch.mock.calls[0][1].headers as Record<string, string>)["Idempotency-Key"]).toBeUndefined();
  });
});
