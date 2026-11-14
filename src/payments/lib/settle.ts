/** Reglas para cobrar o liberar una retención al confirmar con el proveedor (REQ-3483). Puro. */

/** $20,000 MXN: desde aquí Mila pide el OK del PO por WhatsApp aunque todo coincida. */
export const PO_APPROVAL_CENTAVOS = 2_000_000;

export type NeedsPoReason = "date_changed" | "people_changed" | "price_changed" | "amount_over_limit" | "ambiguous";

export interface HeldRequest { date: string; adults: number; children: number; infants: number; amount: number; currency: string; heldCentavos: number }
export interface ProviderConfirmation { date: string; adults: number; children: number; infants: number; amount: number; currency: string; ambiguous?: boolean }

export type CaptureDecision = { action: "capture" } | { action: "needs_po"; reasons: NeedsPoReason[] };

// REQ-3483: Mila cobra sola solo si la confirmación coincide en fecha, personas y precio, no es ambigua y el cobro es menor de $20,000 MXN.
export function decideCapture(req: HeldRequest, conf: ProviderConfirmation, poApproved: boolean): CaptureDecision {
  if (poApproved) return { action: "capture" };
  const reasons: NeedsPoReason[] = [];
  if (conf.date !== req.date) reasons.push("date_changed");
  if (conf.adults !== req.adults || conf.children !== req.children || conf.infants !== req.infants) reasons.push("people_changed");
  if (conf.currency !== req.currency || Math.abs(conf.amount - req.amount) >= 0.01) reasons.push("price_changed");
  if (conf.ambiguous) reasons.push("ambiguous");
  if (req.heldCentavos >= PO_APPROVAL_CENTAVOS) reasons.push("amount_over_limit");
  return reasons.length ? { action: "needs_po", reasons } : { action: "capture" };
}
