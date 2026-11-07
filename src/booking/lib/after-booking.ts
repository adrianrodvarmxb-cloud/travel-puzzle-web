/** Qué hace el navegador después de reservar: pagar en el checkout o mostrar la confirmación. Puro. */
// REQ-011
export function nextStepAfterBooking(r: { paymentUrl?: unknown }): { kind: "pay"; url: string } | { kind: "confirmed" } {
  return typeof r.paymentUrl === "string" && /^https:\/\//.test(r.paymentUrl) ? { kind: "pay", url: r.paymentUrl } : { kind: "confirmed" };
}

/** REQ-938 (D7): solo se pide checkout si hoy hay algo que cobrar; con pago a la llegada se confirma directo. */
// REQ-938
export function needsCheckout(p: { isPaid: boolean; payNow: number }): boolean {
  return p.isPaid && p.payNow > 0;
}
