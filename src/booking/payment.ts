/**
 * Pago de tours de Freetour con su checkout (gate A, modo 2). Recibe sus dependencias por parámetro.
 * startPayment → el cliente paga en Freetour → confirmPayment (página de éxito o cron) → confirmación.
 */
import { GatewayError } from "./gateway-client";
import { paymentReturnUrls } from "./lib/payment-urls";
import { paymentOutcome, shouldRetry, type PaymentOutcome } from "./lib/payment-state";

export interface PaymentRow {
  refNumber: string;
  manageToken: string;
  checkoutSessionId: string | null;
  paymentStatus: PaymentOutcome | "expired" | null;
  paymentExpiresAt: string | null;
  paymentCheckedAt: string | null;
}

// REQ-011
export async function startPayment(
  booking: { refNumber: string; manageToken: string },
  d: {
    createPayment(p: { refNumber: string; successUrl: string; cancelUrl: string }): Promise<{ paymentUrl: string; checkoutSessionId: string; expiresAt: string }>;
    savePayment(refNumber: string, p: { checkoutSessionId: string; paymentUrl: string; paymentStatus: "pending"; paymentExpiresAt: string }): Promise<void>;
    siteUrl: string;
  }
): Promise<string> {
  const urls = paymentReturnUrls(d.siteUrl, booking.manageToken);
  const s = await d.createPayment({ refNumber: booking.refNumber, ...urls });
  await d.savePayment(booking.refNumber, { checkoutSessionId: s.checkoutSessionId, paymentUrl: s.paymentUrl, paymentStatus: "pending", paymentExpiresAt: s.expiresAt });
  return s.paymentUrl;
}

// REQ-012
export async function confirmPayment(
  token: string,
  d: {
    load(token: string): Promise<PaymentRow | null>;
    getPaymentStatus(checkoutSessionId: string): Promise<{ paymentStatus: number }>;
    markPayment(refNumber: string, outcome: PaymentOutcome, now: Date): Promise<void>;
    sendConfirmation(refNumber: string): Promise<void>;
    now: Date;
  }
): Promise<PaymentOutcome | "not_found" | "not_paid_tour"> {
  const row = await d.load(token);
  if (!row) return "not_found";
  if (!row.checkoutSessionId) return "not_paid_tour";
  if (row.paymentStatus === "paid") return "paid";
  let outcome: PaymentOutcome;
  try {
    outcome = paymentOutcome(await d.getPaymentStatus(row.checkoutSessionId));
  } catch (e) {
    outcome = e instanceof GatewayError ? paymentOutcome({ errorCode: e.errorCode ?? undefined }) : "pending";
  }
  await d.markPayment(row.refNumber, outcome, d.now);
  if (outcome === "paid") await d.sendConfirmation(row.refNumber);
  return outcome;
}

// REQ-012
export async function retryPendingPayments(d: {
  listPending(): Promise<PaymentRow[]>;
  confirm(token: string): Promise<unknown>;
  expire(refNumber: string, now: Date): Promise<void>;
  now: Date;
}): Promise<{ checked: number; expired: number }> {
  let checked = 0, expired = 0;
  for (const r of await d.listPending()) {
    if (r.paymentExpiresAt && Date.parse(r.paymentExpiresAt) <= d.now.getTime()) { await d.expire(r.refNumber, d.now); expired++; continue; }
    if (!shouldRetry({ outcome: "pending", expiresAt: r.paymentExpiresAt, lastCheckAt: r.paymentCheckedAt }, d.now)) continue;
    await d.confirm(r.manageToken);
    checked++;
  }
  return { checked, expired };
}
