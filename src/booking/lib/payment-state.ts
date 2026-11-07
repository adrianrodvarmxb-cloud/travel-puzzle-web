import { parseUtc } from "./cancel-policy";
/** Estado del pago de una reserva de Freetour (GET /payment/{id}). Puro. */

export type PaymentOutcome = "paid" | "pending" | "canceled" | "review";

// REQ-012
export function paymentOutcome(r: { paymentStatus?: number; errorCode?: number }): PaymentOutcome {
  if (r.paymentStatus === 1) return "paid";
  switch (r.errorCode) {
    case 63: return "pending"; // aún sin pagar
    case 61: return "paid"; // ya pagado
    case 38: case 39: return "canceled"; // reserva cancelada o rechazada
    default: return "review"; // 60, 62, 64 u otro: lo revisa una persona
  }
}

const RETRY_MS = 10 * 60 * 1000; // Freetour pide no consultar más de una vez cada 10 minutos

// REQ-012
export function shouldRetry(s: { outcome: PaymentOutcome; expiresAt: string | null; lastCheckAt: string | null }, now: Date): boolean {
  if (s.outcome !== "pending") return false;
  if (s.expiresAt && Date.parse(s.expiresAt) <= now.getTime()) return false;
  return !s.lastCheckAt || now.getTime() - Date.parse(s.lastCheckAt) >= RETRY_MS;
}

/**
 * Tiempo extra tras vencer la sesión de pago (`expiresAt`) en el que, si el cliente vuelve, se le genera un enlace
 * nuevo. Pasado ese tiempo (o si el tour ya empezó) la reserva se cancela en FREETOUR. Valor a firmar por el PO
 * (docs/gates-pago-vencido-2026-11.md).
 */
export const PAYMENT_GRACE_MS = 60 * 60 * 1000;

// REQ-931 REQ-932
export function sessionAction(s: { expiresAt: string | null; eventUtcDate: string | null }, now: Date): "valid" | "regenerate" | "cancel" {
  const exp = s.expiresAt ? Date.parse(s.expiresAt) : NaN;
  if (!Number.isFinite(exp) || exp > now.getTime()) return "valid";
  const start = parseUtc(s.eventUtcDate);
  if (Number.isFinite(start) && start <= now.getTime()) return "cancel";
  return now.getTime() - exp < PAYMENT_GRACE_MS ? "regenerate" : "cancel";
}

// REQ-933: tras un error 63 no se vuelve a consultar GET /payment antes de 10 minutos.
export function canCheckNow(lastCheckAt: string | null, now: Date): boolean {
  if (!lastCheckAt) return true;
  const last = Date.parse(lastCheckAt);
  return !Number.isFinite(last) || now.getTime() - last >= RETRY_MS;
}
