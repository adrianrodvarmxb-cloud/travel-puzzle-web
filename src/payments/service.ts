/** Pagos con Stripe: enlace de pago y webhook. Dependencias por parámetro (I/O fuera). */
import type { FxRates } from "@/trips/lib/money";
import { chargeAmount, buildCheckoutParams, sessionExpiry, type PayCurrency, type PaymentKind } from "./lib/checkout";
import { parsePaymentEvent } from "./lib/webhook";
import { buildPaymentLinkEmail, buildPaidCustomerEmail, buildPaidTeamEmail } from "./lib/email";

export interface PayRequest { id: string; ref: string; tripTitle: string; email: string; firstName: string; language: string }
type Mail = { to: string; subject: string; html: string; text: string };

export interface PaymentRow {
  id: string; requestId: string; kind: PaymentKind; amountCentavos: number; currency: "MXN";
  originalAmount: number; originalCurrency: PayCurrency; fxRate: number | null; fxCushionPct: number;
  stripeSessionId: string; checkoutUrl: string; expiresAt: Date; status: "pending";
}

export interface LinkDeps {
  enabled: boolean; now: Date; cushionPct: number; siteUrl: string; logoUrl: string;
  newId(): string;
  findRequest(id: string): Promise<PayRequest | null>;
  getRates(): Promise<FxRates | null>;
  listPending(requestId: string): Promise<{ id: string; sessionId: string }[]>;
  expireSession(sessionId: string): Promise<unknown>;
  markReplaced(paymentId: string): Promise<unknown>;
  createSession(params: Record<string, string>): Promise<{ id: string; url: string }>;
  insertPayment(row: PaymentRow): Promise<unknown>;
  setRequestStatus(id: string, status: string): Promise<unknown>;
  sendCustomer(m: Mail): Promise<unknown>;
}

export type LinkResult =
  | { ok: true; url: string; centavos: number }
  | { ok: false; code: "disabled" | "not_found" | "no_fx" | "invalid_amount" | "stripe_error" };

// REQ-159, REQ-115, REQ-116, REQ-118
export async function createPaymentLink(
  input: { requestId: string; amount: number; currency: PayCurrency; kind: PaymentKind },
  d: LinkDeps
): Promise<LinkResult> {
  if (!d.enabled) return { ok: false, code: "disabled" };
  const req = await d.findRequest(input.requestId);
  if (!req) return { ok: false, code: "not_found" };
  const rates = input.currency === "MXN" ? null : await d.getRates();
  if (input.currency !== "MXN" && !rates) return { ok: false, code: "no_fx" };
  const charge = chargeAmount(input.amount, input.currency, rates, d.cushionPct);
  if (!charge) return { ok: false, code: "invalid_amount" };

  // REQ-116: un solo enlace vivo por solicitud.
  for (const p of await d.listPending(req.id)) {
    await d.expireSession(p.sessionId).catch((e) => console.warn(`[pagos] no se pudo vencer ${p.sessionId}:`, (e as Error).message));
    await d.markReplaced(p.id);
  }

  const paymentId = d.newId();
  const expiresAt = sessionExpiry(d.now);
  let session: { id: string; url: string };
  try {
    session = await d.createSession(
      buildCheckoutParams({ paymentId, requestId: req.id, ref: req.ref, tripTitle: req.tripTitle, kind: input.kind, centavos: charge.centavos, email: req.email, siteUrl: d.siteUrl, expiresAt })
    );
  } catch (e) {
    console.error(`[pagos] Stripe no creó la sesión de ${req.ref}:`, (e as Error).message);
    return { ok: false, code: "stripe_error" };
  }

  await d.insertPayment({
    id: paymentId, requestId: req.id, kind: input.kind, amountCentavos: charge.centavos, currency: "MXN",
    originalAmount: input.amount, originalCurrency: input.currency, fxRate: charge.fxRate, fxCushionPct: input.currency === "MXN" ? 0 : d.cushionPct,
    stripeSessionId: session.id, checkoutUrl: session.url, expiresAt: new Date(expiresAt * 1000), status: "pending",
  });
  await d.setRequestStatus(req.id, "quoted");
  const mail = buildPaymentLinkEmail({ ref: req.ref, tripTitle: req.tripTitle, firstName: req.firstName, kind: input.kind, centavos: charge.centavos, logoUrl: d.logoUrl }, session.url);
  await d.sendCustomer({ to: req.email, ...mail }).catch((e) => console.error(`[pagos] correo de enlace ${req.ref}:`, (e as Error).message));
  return { ok: true, url: session.url, centavos: charge.centavos };
}

export interface WebhookDeps {
  enabled: boolean; secret: string; now: Date; siteUrl: string; logoUrl: string;
  verify(payload: string, header: string | null, secret: string, nowSeconds: number): Promise<boolean>;
  /** Pasa a "paid" solo si no lo estaba; devuelve el pago si cambió, null si ya estaba pagado o no existe. */
  markPaid(paymentId: string, data: { sessionId: string; paymentIntent: string | null; amountCentavos: number; paidAt: Date }): Promise<{ id: string; requestId: string; kind: PaymentKind; amountCentavos: number } | null>;
  markExpired(paymentId: string): Promise<unknown>;
  findRequest(id: string): Promise<PayRequest | null>;
  setRequestStatus(id: string, status: string): Promise<unknown>;
  sendCustomer(m: Mail): Promise<unknown>;
  sendTeam(m: Omit<Mail, "to">): Promise<unknown>;
  /**
   * REQ-3419: compra directa (Big Bus por OCTO). Si devuelve true, la compra manda su propio correo (el boleto)
   * y se omite el «Recibimos tu pago» genérico. Sin este gancho, todo sigue igual.
   */
  afterPaid?(requestId: string): Promise<boolean>;
  /** REQ-3419: libera lo apartado cuando la sesión de Stripe vence sin pago. */
  afterExpired?(paymentId: string): Promise<unknown>;
}

export type WebhookResult = "disabled" | "invalid" | "ignored" | "paid" | "duplicate" | "expired";

// REQ-117, REQ-118
export async function handleStripeWebhook(payload: string, signature: string | null, d: WebhookDeps): Promise<WebhookResult> {
  if (!d.enabled) return "disabled";
  if (!(await d.verify(payload, signature, d.secret, Math.floor(d.now.getTime() / 1000)))) return "invalid";
  let event: unknown;
  try { event = JSON.parse(payload); } catch { return "ignored"; }
  const ev = parsePaymentEvent(event);
  if (ev.type === "expired") {
    await d.markExpired(ev.paymentId);
    // REQ-3419
    await d.afterExpired?.(ev.paymentId).catch((e) => console.error(`[pagos] liberar apartado ${ev.paymentId}:`, (e as Error).message));
    return "expired";
  }
  if (ev.type !== "paid") return "ignored";

  const changed = await d.markPaid(ev.paymentId, { sessionId: ev.sessionId, paymentIntent: ev.paymentIntent, amountCentavos: ev.amountCentavos, paidAt: d.now });
  if (!changed) return "duplicate";
  await d.setRequestStatus(changed.requestId, "paid");
  // REQ-3419: la compra directa confirma con el operador y manda el boleto.
  const handled = d.afterPaid ? await d.afterPaid(changed.requestId).catch((e) => { console.error(`[pagos] compra directa ${changed.requestId}:`, (e as Error).message); return false; }) : false;
  const req = await d.findRequest(changed.requestId);
  if (req) {
    const info = { ref: req.ref, tripTitle: req.tripTitle, firstName: req.firstName, kind: changed.kind, centavos: changed.amountCentavos, logoUrl: d.logoUrl };
    if (!handled) await d.sendCustomer({ to: req.email, ...buildPaidCustomerEmail(info) }).catch((e) => console.error(`[pagos] correo pagado ${req.ref}:`, (e as Error).message));
    await d.sendTeam(buildPaidTeamEmail(info, `${d.siteUrl}/admin/solicitudes`)).catch((e) => console.error(`[pagos] aviso equipo ${req.ref}:`, (e as Error).message));
  }
  return "paid";
}
