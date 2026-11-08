/**
 * Pago de tours de Freetour con su checkout (gate A, modo 2). Recibe sus dependencias por parámetro.
 * startPayment → el cliente paga en Freetour → confirmPayment (página de éxito o cron) → confirmación.
 */
import { GatewayError } from "./gateway-client";
import { paymentReturnUrls } from "./lib/payment-urls";
import { canCheckNow, paymentOutcome, sessionAction, type PaymentOutcome } from "./lib/payment-state";
import { cancelFailureAction } from "./lib/cancel-fallback";

export interface PaymentRow {
  refNumber: string;
  manageToken: string;
  checkoutSessionId: string | null;
  paymentStatus: PaymentOutcome | "expired" | "expired_manual" | null;
  paymentExpiresAt: string | null;
  paymentCheckedAt: string | null;
  /** REQ-931/932: para reutilizar el enlace, saber si el tour ya empezó y cancelar con los 4 campos. */
  paymentUrl: string | null;
  eventUtcDate: string | null;
  eventId: number;
  adults: number;
  children: number;
  status: string;
}

/** Consulta GET /payment/{id}; un error de la pasarela se traduce a su código (63 = sin pagar). */
async function checkOutcome(getPaymentStatus: (id: string) => Promise<{ paymentStatus: number }>, id: string): Promise<PaymentOutcome | "unreachable"> {
  try {
    return paymentOutcome(await getPaymentStatus(id));
  } catch (e) {
    return e instanceof GatewayError ? paymentOutcome({ errorCode: e.errorCode ?? undefined }) : "unreachable";
  }
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
  // REQ-933: tras un error 63 no se vuelve a preguntar a FREETOUR antes de 10 minutos.
  if (row.paymentStatus === "pending" && !canCheckNow(row.paymentCheckedAt, d.now)) return "pending";
  const checked = await checkOutcome(d.getPaymentStatus, row.checkoutSessionId);
  const outcome: PaymentOutcome = checked === "unreachable" ? "pending" : checked;
  await d.markPayment(row.refNumber, outcome, d.now);
  if (outcome === "paid") await d.sendConfirmation(row.refNumber);
  return outcome;
}

// REQ-012 REQ-932 REQ-933
export async function retryPendingPayments(d: {
  listPending(): Promise<PaymentRow[]>;
  confirm(token: string): Promise<unknown>;
  expire(row: PaymentRow, now: Date): Promise<unknown>;
  now: Date;
}): Promise<{ checked: number; expired: number }> {
  let checked = 0, expired = 0;
  for (const r of await d.listPending()) {
    // REQ-932: vencida y pasada la gracia (o el tour ya empezó) → se cancela en FREETOUR.
    if (sessionAction({ expiresAt: r.paymentExpiresAt, eventUtcDate: r.eventUtcDate }, d.now) === "cancel") { await d.expire(r, d.now); expired++; continue; }
    // REQ-933: vigente o en la gracia → se consulta como máximo cada 10 minutos.
    if (!canCheckNow(r.paymentCheckedAt, d.now)) continue;
    await d.confirm(r.manageToken);
    checked++;
  }
  return { checked, expired };
}

export type ExpireResult = "paid" | "canceled" | "manual" | "retry";

/**
 * REQ-932: la sesión venció y no se pagó. Última consulta de pago; si sigue sin pagar, se cancela en FREETOUR
 * (POST /booking/cancel con refNumber, eventId, adults y children, lo que funciona en producción) y se avisa al
 * cliente. Si FREETOUR no acepta cancelar, o el estado de pago es dudoso, la reserva pasa al equipo (REQ-017).
 */
// REQ-932
export async function expirePayment(
  row: PaymentRow,
  d: {
    getPaymentStatus(checkoutSessionId: string): Promise<{ paymentStatus: number }>;
    markPayment(refNumber: string, outcome: string, now: Date): Promise<void>;
    sendConfirmation(refNumber: string): Promise<void>;
    cancel(ref: { refNumber: string; eventId: number; adults: number; children: number }): Promise<unknown>;
    notifyExpired(refNumber: string): Promise<unknown>;
    requestManual(refNumber: string): Promise<unknown>;
    now: Date;
  }
): Promise<ExpireResult> {
  // Ya rechazada (webhook, A3) o cancelada: el cliente ya recibió su aviso; solo se cierra el pago.
  if (row.status === "rejected" || row.status === "canceled") {
    await d.markPayment(row.refNumber, row.status, d.now);
    return "canceled";
  }
  const outcome = row.checkoutSessionId ? await checkOutcome(d.getPaymentStatus, row.checkoutSessionId) : "pending";
  if (outcome === "unreachable") return "retry";
  if (outcome === "paid") {
    await d.markPayment(row.refNumber, "paid", d.now);
    await d.sendConfirmation(row.refNumber);
    return "paid";
  }
  if (outcome === "review") {
    await d.requestManual(row.refNumber);
    await d.markPayment(row.refNumber, "expired_manual", d.now);
    return "manual";
  }
  if (outcome === "pending") {
    try {
      await d.cancel({ refNumber: row.refNumber, eventId: row.eventId, adults: row.adults, children: row.children });
    } catch (e) {
      if (cancelFailureAction(e as { status?: number; errorCode?: number | null }) !== "already") {
        await d.requestManual(row.refNumber);
        await d.markPayment(row.refNumber, "expired_manual", d.now);
        return "manual";
      }
    }
  }
  await d.markPayment(row.refNumber, "expired", d.now);
  await d.notifyExpired(row.refNumber);
  return "canceled";
}

export type ResumeResult = { kind: "pay"; url: string } | { kind: "paid" } | { kind: "canceled" } | { kind: "error" } | { kind: "not_found" };

/**
 * REQ-931: el cliente vuelve a pagar (botón del correo, de su reserva o de la página de pago cancelado).
 * Sesión vigente → mismo enlace; vencida dentro de la gracia → enlace nuevo (POST /payment); fuera → se cancela.
 */
// REQ-931
export async function resumePayment(
  token: string,
  d: {
    load(token: string): Promise<PaymentRow | null>;
    getPaymentStatus(checkoutSessionId: string): Promise<{ paymentStatus: number }>;
    markPayment(refNumber: string, outcome: PaymentOutcome, now: Date): Promise<void>;
    sendConfirmation(refNumber: string): Promise<void>;
    createPayment(p: { refNumber: string; successUrl: string; cancelUrl: string }): Promise<{ paymentUrl: string; checkoutSessionId: string; expiresAt: string }>;
    savePayment(refNumber: string, p: { checkoutSessionId: string; paymentUrl: string; paymentStatus: "pending"; paymentExpiresAt: string }): Promise<void>;
    expire(row: PaymentRow): Promise<unknown>;
    siteUrl: string;
    now: Date;
  }
): Promise<ResumeResult> {
  const row = await d.load(token);
  if (!row || !row.checkoutSessionId) return { kind: "not_found" };
  if (row.paymentStatus === "paid") return { kind: "paid" };
  if (row.paymentStatus !== "pending" || row.status === "canceled") return { kind: "canceled" };
  const action = sessionAction({ expiresAt: row.paymentExpiresAt, eventUtcDate: row.eventUtcDate }, d.now);
  if (action === "cancel") {
    await d.expire(row);
    return { kind: "canceled" };
  }
  if (action === "valid") return row.paymentUrl && /^https:\/\//.test(row.paymentUrl) ? { kind: "pay", url: row.paymentUrl } : { kind: "error" };
  // Vencida en la gracia: antes de cobrar otra vez, ¿pagó en el último momento? (respetando los 10 min, REQ-933)
  if (canCheckNow(row.paymentCheckedAt, d.now)) {
    const outcome = await checkOutcome(d.getPaymentStatus, row.checkoutSessionId);
    if (outcome === "paid") {
      await d.markPayment(row.refNumber, "paid", d.now);
      await d.sendConfirmation(row.refNumber);
      return { kind: "paid" };
    }
    if (outcome === "canceled") {
      await d.markPayment(row.refNumber, "canceled", d.now);
      return { kind: "canceled" };
    }
    if (outcome === "review" || outcome === "unreachable") return { kind: "error" };
    await d.markPayment(row.refNumber, "pending", d.now);
  }
  try {
    const url = await startPayment(row, { createPayment: d.createPayment, savePayment: d.savePayment, siteUrl: d.siteUrl });
    return /^https:\/\//.test(url) ? { kind: "pay", url } : { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}
