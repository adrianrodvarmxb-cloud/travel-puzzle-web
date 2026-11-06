/** Webhook de Stripe: firma (https://docs.stripe.com/webhooks#verify-manually) y lectura del evento. Puro (WebCrypto). */

const TOLERANCE_SECONDS = 300;

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparación en tiempo constante. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// REQ-117
export async function verifyStripeSignature(payload: string, header: string | null, secret: string, nowSeconds: number): Promise<boolean> {
  if (!header || !secret) return false;
  let t: number | null = null;
  const v1: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t" && v && /^\d+$/.test(v)) t = Number(v);
    else if (k === "v1" && v) v1.push(v);
  }
  if (t === null || v1.length === 0) return false;
  if (Math.abs(nowSeconds - t) > TOLERANCE_SECONDS) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`)));
  return v1.some((s) => safeEqual(s, expected));
}

export type PaymentEvent =
  | { type: "paid"; paymentId: string; sessionId: string; amountCentavos: number; paymentIntent: string | null }
  | { type: "expired"; paymentId: string; sessionId: string }
  | { type: "ignore" };

// REQ-117
export function parsePaymentEvent(event: unknown): PaymentEvent {
  const e = event as { type?: string; data?: { object?: Record<string, unknown> } } | null;
  const o = e?.data?.object;
  if (!e || !o) return { type: "ignore" };
  const paymentId = (o.metadata as Record<string, unknown> | undefined)?.payment_id;
  const sessionId = o.id;
  if (typeof paymentId !== "string" || !paymentId || typeof sessionId !== "string") return { type: "ignore" };
  if (e.type === "checkout.session.completed" || e.type === "checkout.session.async_payment_succeeded") {
    if (o.payment_status !== "paid") return { type: "ignore" };
    return {
      type: "paid", paymentId, sessionId,
      amountCentavos: typeof o.amount_total === "number" ? o.amount_total : 0,
      paymentIntent: typeof o.payment_intent === "string" ? o.payment_intent : null,
    };
  }
  if (e.type === "checkout.session.expired") return { type: "expired", paymentId, sessionId };
  return { type: "ignore" };
}
