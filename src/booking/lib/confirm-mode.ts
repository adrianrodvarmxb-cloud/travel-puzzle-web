/** Qué ofrece el paso «Confirmar» del formulario de reserva. Puro. */
export type ConfirmMode = "closed" | "free" | "paid_soon" | "pay";

// REQ-935
export function confirmMode(s: { bookingsEnabled: boolean; isPaid: boolean; paidEnabled: boolean }): ConfirmMode {
  if (!s.bookingsEnabled) return "closed";
  if (!s.isPaid) return "free";
  return s.paidEnabled ? "pay" : "paid_soon";
}
