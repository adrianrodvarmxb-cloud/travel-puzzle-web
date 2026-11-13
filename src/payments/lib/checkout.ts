/** Cobro con Stripe Checkout (gates A, B1, C1 — docs/gates-stripe-2026-11.md). Puro. */
import type { FxRates } from "@/trips/lib/money";

export type PayCurrency = "MXN" | "USD" | "EUR";
export type PaymentKind = "anticipo" | "liquidacion" | "total";
export const PAYMENT_KINDS = ["anticipo", "liquidacion", "total"] as const;

/** Mínimo de Stripe para MXN: $10.00. */
export const MIN_CENTAVOS = 1000;
/** Stripe permite como máximo 24 h; se deja 1 min de margen por relojes. */
const EXPIRY_SECONDS = 24 * 3600 - 60;

const KIND_LABEL: Record<PaymentKind, string> = { anticipo: "Anticipo", liquidacion: "Liquidación", total: "Pago total" };

// REQ-118
export function isStripeEnabled(value: string | undefined): boolean {
  return value === "true";
}

// REQ-115: siempre en pesos; USD/EUR con FIX Banxico + colchón, hacia arriba al peso.
export function chargeAmount(amount: number, currency: PayCurrency, rates: FxRates | null, cushionPct: number): { centavos: number; fxRate: number | null } | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  let centavos: number;
  let fxRate: number | null = null;
  if (currency === "MXN") {
    centavos = Math.round(amount * 100);
  } else {
    if (!rates) return null;
    fxRate = rates[currency];
    const pesos = Math.ceil(Number((amount * fxRate * (1 + cushionPct / 100)).toFixed(6)));
    centavos = pesos * 100;
  }
  if (centavos < MIN_CENTAVOS) return null;
  return { centavos, fxRate };
}

// REQ-116
export function sessionExpiry(now: Date): number {
  return Math.floor(now.getTime() / 1000) + EXPIRY_SECONDS;
}

export interface CheckoutInput {
  paymentId: string; requestId: string; ref: string; tripTitle: string; kind: PaymentKind;
  centavos: number; email: string; siteUrl: string; expiresAt: number;
  /** REQ-3482: retiene en la tarjeta sin cobrar (captura manual); el cobro o la liberación llegan al confirmar. */
  manualCapture?: boolean;
}

// REQ-159: parámetros de POST /v1/checkout/sessions (form-urlencoded).
export function buildCheckoutParams(i: CheckoutInput): Record<string, string> {
  const hold: Record<string, string> = i.manualCapture
    ? { "payment_intent_data[capture_method]": "manual", "metadata[hold]": "1", "payment_intent_data[metadata][hold]": "1" } // REQ-3482
    : {};
  const label = i.manualCapture ? "Retención en tarjeta" : KIND_LABEL[i.kind];
  return {
    ...hold,
    mode: "payment",
    "payment_method_types[0]": "card",
    "line_items[0][price_data][currency]": "mxn",
    "line_items[0][price_data][unit_amount]": String(i.centavos),
    "line_items[0][price_data][product_data][name]": `${label} · ${i.tripTitle} (${i.ref})`,
    "line_items[0][quantity]": "1",
    customer_email: i.email,
    client_reference_id: i.paymentId,
    "metadata[payment_id]": i.paymentId,
    "metadata[request_id]": i.requestId,
    "metadata[kind]": i.kind,
    "payment_intent_data[metadata][payment_id]": i.paymentId,
    locale: "es",
    expires_at: String(i.expiresAt),
    // REQ-3482: la retención vuelve a la página de gracias de la solicitud; el cobro de siempre, como hoy.
    success_url: i.manualCapture ? `${i.siteUrl}/viajes/gracias?folio=${encodeURIComponent(i.ref)}` : `${i.siteUrl}/?pago=recibido&ref=${encodeURIComponent(i.ref)}`,
    cancel_url: `${i.siteUrl}/`,
  };
}

export const kindLabel = (k: PaymentKind) => KIND_LABEL[k];
