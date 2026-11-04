/** URLs de regreso del checkout de Freetour (deben ser https). Puro. */
// REQ-011
export function paymentReturnUrls(siteUrl: string, token: string): { successUrl: string; cancelUrl: string } {
  const site = siteUrl.replace(/\/+$/, "");
  if (!/^https:\/\//.test(site)) throw new Error("SITE_URL debe ser https para cobrar");
  const base = `${site}/reserva/${encodeURIComponent(token)}/pago`;
  return { successUrl: `${base}/exito`, cancelUrl: `${base}/cancelado` };
}
