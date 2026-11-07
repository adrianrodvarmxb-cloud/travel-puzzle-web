/** URLs de regreso del checkout de Freetour (deben ser https). Puro. */
// REQ-011
export function paymentReturnUrls(siteUrl: string, token: string): { successUrl: string; cancelUrl: string } {
  const site = siteUrl.replace(/\/+$/, "");
  if (!/^https:\/\//.test(site)) throw new Error("SITE_URL debe ser https para cobrar");
  const base = `${site}/reserva/${encodeURIComponent(token)}/pago`;
  return { successUrl: `${base}/exito`, cancelUrl: `${base}/cancelado` };
}

/** REQ-931: destino del botón «Pagar» según lo que resolvió resumePayment. */
// REQ-931
export function resumeRedirect(r: { kind: "pay"; url: string } | { kind: "paid" | "canceled" | "error" | "not_found" }, token: string): string {
  const base = `/reserva/${encodeURIComponent(token)}`;
  switch (r.kind) {
    case "pay": return /^https:\/\//.test(r.url) ? r.url : `${base}/pago/cancelado?estado=error`;
    case "paid": return `${base}/pago/exito`;
    case "canceled": return `${base}/pago/cancelado?estado=vencido`;
    case "error": return `${base}/pago/cancelado?estado=error`;
    default: return base;
  }
}
