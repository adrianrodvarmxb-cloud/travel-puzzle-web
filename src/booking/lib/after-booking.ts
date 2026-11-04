/** Qué hace el navegador después de reservar: pagar en el checkout o mostrar la confirmación. Puro. */
// REQ-011
export function nextStepAfterBooking(r: { paymentUrl?: unknown }): { kind: "pay"; url: string } | { kind: "confirmed" } {
  return typeof r.paymentUrl === "string" && /^https:\/\//.test(r.paymentUrl) ? { kind: "pay", url: r.paymentUrl } : { kind: "confirmed" };
}
