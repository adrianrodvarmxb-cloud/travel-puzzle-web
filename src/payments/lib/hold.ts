/** Retención en tarjeta al solicitar (REQ-3482, REQ-059). Puro. */

// REQ-3482
export function isHoldEnabled(value: string | undefined): boolean {
  return value === "true";
}

export interface HoldInput { holdFlag: string | undefined; stripeFlag: string | undefined; kind: string; estimate: number | null }

/**
 * REQ-3482: retiene solo con las dos banderas encendidas, en una reserva y con precio conocido.
 * Un viaje personalizado o un precio «por confirmar» se solicita sin retención (gate G3 del PR #446).
 */
export function holdApplies(i: HoldInput): boolean {
  if (!isHoldEnabled(i.holdFlag) || i.stripeFlag !== "true") return false;
  if (i.kind !== "reserva") return false;
  return typeof i.estimate === "number" && Number.isFinite(i.estimate) && i.estimate > 0;
}

/** REQ-3482: solo se redirige al cliente a un checkout https de Stripe. */
export function safeCheckoutUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "checkout.stripe.com" ? url : null;
  } catch {
    return null;
  }
}
