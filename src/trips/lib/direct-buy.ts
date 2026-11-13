/**
 * REQ-3533 / REQ-3534: compra directa de viajes de proveedor (gates firmados por el PO, 13-11-2026):
 * 1 = se cobra el total al reservar; 2 = como Viator: el proveedor confirma en hasta 48 h y, si no hay lugar
 * o no contesta, el reembolso total sale automático; 3 = prueba con un viaje oculto con enlace (REQ-3535).
 * Puro: banderas, ventana de confirmación, estados y firma del enlace del proveedor (Web Crypto).
 */

/** Horas que tiene el proveedor para confirmar después del pago. */
export const SUPPLIER_WINDOW_HOURS = 48;

// REQ-3533
export function isDirectBuyEnabled(value: string | undefined): boolean {
  return value === "true";
}

// REQ-3533: el viaje se vende con pago directo solo con la bandera, Stripe y el viaje en modo «comprar».
export function canBuyDirect(
  trip: { purchaseMode: string; kind: string },
  flags: { enabled: boolean; stripe: boolean }
): boolean {
  return flags.enabled && flags.stripe && trip.purchaseMode === "buy" && trip.kind !== "personalizado";
}

/**
 * Estados de la solicitud de compra directa (TripRequest.kind = "compra"):
 * awaiting_payment → (webhook) awaiting_supplier → confirmed | refunding → refunded | refund_failed.
 */
export type BuyStatus = "awaiting_payment" | "awaiting_supplier" | "confirmed" | "refunding" | "refunded" | "refund_failed" | "failed";
export type SupplierAction = "confirm" | "decline" | "timeout";

// REQ-3534: solo una decisión cuenta; lo que ya se decidió no cambia (idempotente ante doble clic o cron).
export function decide(status: string, action: SupplierAction): { next: BuyStatus; refund: boolean } | null {
  if (status !== "awaiting_supplier") return null;
  return action === "confirm" ? { next: "confirmed", refund: false } : { next: "refunding", refund: true };
}

// REQ-3534
export function supplierDeadline(paidAt: Date): Date {
  return new Date(paidAt.getTime() + SUPPLIER_WINDOW_HOURS * 3600 * 1000);
}

// REQ-3534
export function isPastDeadline(paidAt: Date, now: Date): boolean {
  return now.getTime() >= supplierDeadline(paidAt).getTime();
}

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// REQ-3534: firma del enlace del proveedor (no vence: la decisión solo cuenta mientras la compra espera respuesta).
export async function signSupplierLink(secret: string, requestId: string): Promise<string> {
  if (!secret) throw new Error("Falta el secreto para firmar el enlace del proveedor");
  const key = await crypto.subtle.importKey("raw", enc.encode(`compra-proveedor:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(requestId)));
}

// REQ-3534
export async function verifySupplierLink(secret: string, requestId: string, sig: string): Promise<boolean> {
  if (!secret || !requestId || !sig) return false;
  const expected = await signSupplierLink(secret, requestId);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

// REQ-3534
export function supplierLink(siteUrl: string, requestId: string, sig: string): string {
  return `${siteUrl.replace(/\/+$/, "")}/api/viajes/confirmar?id=${encodeURIComponent(requestId)}&sig=${encodeURIComponent(sig)}`;
}

/** REQ-3533: compone el gancho «después del pago»: la primera que lo reconoce (true) gana. */
export function chainAfterPaid(...hooks: (((requestId: string) => Promise<boolean>) | undefined)[]) {
  const list = hooks.filter((h): h is (requestId: string) => Promise<boolean> => !!h);
  if (list.length === 0) return undefined;
  return async (requestId: string) => {
    for (const h of list) if (await h(requestId)) return true;
    return false;
  };
}
