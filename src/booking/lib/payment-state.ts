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
