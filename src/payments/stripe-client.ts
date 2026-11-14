/** Llamadas a la API de Stripe con fetch (sin SDK: más ligero en Workers). https://docs.stripe.com/api */
type Fetch = (url: string, init: RequestInit) => Promise<Response>;

const API = "https://api.stripe.com/v1";

export function createStripeClient({ secretKey, fetch }: { secretKey: string; fetch: Fetch }) {
  async function post(path: string, form: Record<string, string> = {}, idempotencyKey?: string) {
    if (!secretKey) throw new Error("Falta STRIPE_SECRET_KEY");
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": "2024-06-20",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}), // REQ-3483: un reintento nunca cobra ni libera dos veces
      },
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
    // REQ-3483: cobra lo retenido (o una parte) al confirmar con el proveedor.
    async capturePaymentIntent(id: string, amountCentavos: number, idempotencyKey: string): Promise<void> {
      await post(`/payment_intents/${encodeURIComponent(id)}/capture`, { amount_to_capture: String(amountCentavos) }, idempotencyKey);
    },
    // REQ-3483: libera la retención sin cargo.
    async cancelPaymentIntent(id: string, idempotencyKey: string): Promise<void> {
      await post(`/payment_intents/${encodeURIComponent(id)}/cancel`, {}, idempotencyKey);
    },
  };
}
