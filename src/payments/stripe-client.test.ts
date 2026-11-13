import { describe, it, expect, vi } from "vitest";
import { createStripeClient } from "./stripe-client";

describe("cliente de Stripe", () => {
  it("REQ-3534: el reembolso va a /v1/refunds con el payment_intent y la llave de idempotencia", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ id: "re_1" }), { status: 200 }));
    const s = createStripeClient({ secretKey: "sk_test_x", fetch });
    expect(await s.refundPaymentIntent("pi_1", "reembolso-pay_1")).toEqual({ id: "re_1" });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.stripe.com/v1/refunds");
    expect(init.body).toBe("payment_intent=pi_1");
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("reembolso-pay_1");
  });

  it("REQ-3534: si Stripe rechaza el reembolso, lanza con el mensaje", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ error: { message: "Charge already refunded" } }), { status: 400 }));
    await expect(createStripeClient({ secretKey: "sk_test_x", fetch }).refundPaymentIntent("pi_1", "k")).rejects.toThrow("Stripe 400: Charge already refunded");
  });
});
