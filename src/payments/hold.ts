/** Retención en tarjeta al solicitar (REQ-3482). Dependencias por parámetro (I/O fuera). */
import { holdApplies, safeCheckoutUrl } from "./lib/hold";
import type { LinkResult } from "./service";
import type { PayCurrency, PaymentKind } from "./lib/checkout";

export interface HoldDeps {
  holdFlag: string | undefined; stripeFlag: string | undefined;
  findByRef(ref: string): Promise<{ id: string; kind: string; estimate: number | null; currency: PayCurrency } | null>;
  createHold(input: { requestId: string; amount: number; currency: PayCurrency; kind: PaymentKind; hold: true }): Promise<LinkResult>;
}

/**
 * REQ-3482: si aplica, crea el checkout con la tarjeta en retención por el total del viaje y devuelve su URL.
 * Devuelve null cuando no aplica o algo falla: la solicitud ya quedó guardada y sigue como hoy (nunca se tumba).
 */
export async function startRequestHold(ref: string, d: HoldDeps): Promise<{ url: string } | null> {
  if (!holdApplies({ holdFlag: d.holdFlag, stripeFlag: d.stripeFlag, kind: "reserva", estimate: 1 })) return null;
  try {
    const req = await d.findByRef(ref);
    if (!req || !holdApplies({ holdFlag: d.holdFlag, stripeFlag: d.stripeFlag, kind: req.kind, estimate: req.estimate })) return null;
    const r = await d.createHold({ requestId: req.id, amount: req.estimate as number, currency: req.currency, kind: "total", hold: true });
    if (!r.ok) return null;
    const url = safeCheckoutUrl(r.url);
    return url ? { url } : null;
  } catch (e) {
    console.error(`[retencion] ${ref}:`, (e as Error).message);
    return null;
  }
}
