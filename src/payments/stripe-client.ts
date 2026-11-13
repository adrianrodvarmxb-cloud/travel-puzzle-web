/** Llamadas a la API de Stripe con fetch (sin SDK: más ligero en Workers). https://docs.stripe.com/api */
type Fetch = (url: string, init: RequestInit) => Promise<Response>;

const API = "https://api.stripe.com/v1";

export function createStripeClient({ secretKey, fetch }: { secretKey: string; fetch: Fetch }) {
  async function post(path: string, form: Record<string, string> = {}, idempotencyKey?: string) {
    if (!secretKey) throw new Error("Falta STRIPE_SECRET_KEY");
    const headers: Record<string, string> = { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": "2024-06-20" };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers,
      body: new URLSearchParams(form).toString(),
      signal: AbortSignal.timeout(15000),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } } & Record<string, unknown>;
    if (!res.ok) throw new Error(`Stripe ${res.status}: ${json.error?.message ?? "sin detalle"}`);
    return json;
  }
  return {
    // REQ-159
    async createCheckoutSession(params: Record<string, string>): Promise<{ id: string; url: string }> {
      const s = await post("/checkout/sessions", params);
      if (typeof s.id !== "string" || typeof s.url !== "string") throw new Error("Stripe: sesión sin id/url");
      return { id: s.id, url: s.url };
    },
    // REQ-116
    async expireCheckoutSession(id: string): Promise<void> {
      await post(`/checkout/sessions/${encodeURIComponent(id)}/expire`);
    },
    // REQ-3534: reembolso total de un cobro; la llave de idempotencia evita reembolsar dos veces.
    async refundPaymentIntent(paymentIntent: string, idempotencyKey: string): Promise<{ id: string }> {
      const r = await post("/refunds", { payment_intent: paymentIntent }, idempotencyKey);
      if (typeof r.id !== "string") throw new Error("Stripe: reembolso sin id");
      return { id: r.id };
    },
  };
}
