/** Cobrar o liberar una retención al confirmar con el proveedor (REQ-3483). Dependencias por parámetro (I/O fuera). */
import { decideCapture, type NeedsPoReason, type ProviderConfirmation } from "./lib/settle";
import { MIN_CENTAVOS, type PaymentKind } from "./lib/checkout";
import { buildPaidCustomerEmail, buildPaidTeamEmail, buildReleasedCustomerEmail, buildReleasedTeamEmail } from "./lib/email";

type Mail = { to: string; subject: string; html: string; text: string };

export interface HeldPayment {
  payment: { id: string; paymentIntent: string | null; amountCentavos: number; originalAmount: number; originalCurrency: string; kind: PaymentKind };
  request: { id: string; ref: string; tripTitle: string; email: string; firstName: string; date: string; adults: number; children: number; infants: number };
}

export interface SettleDeps {
  enabled: boolean; now: Date; siteUrl: string; logoUrl: string;
  /** La retención vigente («held») de esa solicitud, por folio. */
  findHeld(ref: string): Promise<HeldPayment | null>;
  capture(paymentIntent: string, centavos: number, idempotencyKey: string): Promise<unknown>;
  cancel(paymentIntent: string, idempotencyKey: string): Promise<unknown>;
  /** Pasa de «held» a «paid» solo una vez; false si ya no estaba retenido. */
  markCaptured(paymentId: string, data: { paidAt: Date; amountCentavos: number }): Promise<boolean>;
  /** Pasa de «held» a «released» solo una vez; false si ya no estaba retenido. */
  markReleased(paymentId: string): Promise<boolean>;
  setRequestStatus(id: string, status: string): Promise<unknown>;
  sendCustomer(m: Mail): Promise<unknown>;
  sendTeam(m: Omit<Mail, "to">): Promise<unknown>;
}

export interface SettleInput {
  ref: string; action: "capture" | "release";
  confirmation?: ProviderConfirmation;
  /** El PO dio su OK (por WhatsApp a Mila, o desde el gestor). */
  poApproved?: boolean; poNote?: string;
  /** Cobrar menos de lo retenido (nunca más). */
  captureCentavos?: number;
  reason?: string;
}

export type SettleResult =
  | { ok: true; result: "captured" | "released"; centavos: number; duplicate?: true }
  | { ok: false; code: "disabled" | "not_held" | "invalid" | "stripe_error" }
  | { ok: false; code: "needs_po"; reasons: NeedsPoReason[] };

// REQ-3483
export async function settleHold(input: SettleInput, d: SettleDeps): Promise<SettleResult> {
  if (!d.enabled) return { ok: false, code: "disabled" };
  const h = await d.findHeld(input.ref);
  if (!h) return { ok: false, code: "not_held" };
  const { payment: p, request: r } = h;
  if (!p.paymentIntent) return { ok: false, code: "invalid" };
  const info = (centavos: number) => ({ ref: r.ref, tripTitle: r.tripTitle, firstName: r.firstName, kind: p.kind, centavos, logoUrl: d.logoUrl });
  const adminUrl = `${d.siteUrl}/admin/solicitudes`;

  if (input.action === "release") {
    try { await d.cancel(p.paymentIntent, `release_${p.id}`); } catch (e) { console.error(`[pagos] liberar ${r.ref}:`, (e as Error).message); return { ok: false, code: "stripe_error" }; }
    if (!(await d.markReleased(p.id))) return { ok: true, result: "released", centavos: p.amountCentavos, duplicate: true };
    await d.setRequestStatus(r.id, "closed");
    await d.sendCustomer({ to: r.email, ...buildReleasedCustomerEmail(info(p.amountCentavos)) }).catch((e) => console.error(`[pagos] correo liberada ${r.ref}:`, (e as Error).message));
    await d.sendTeam(buildReleasedTeamEmail(info(p.amountCentavos), adminUrl, input.reason)).catch((e) => console.error(`[pagos] aviso liberada ${r.ref}:`, (e as Error).message));
    return { ok: true, result: "released", centavos: p.amountCentavos };
  }

  // Cobrar: sin OK del PO hace falta la confirmación del proveedor y que coincida.
  const poApproved = input.poApproved === true;
  if (!poApproved) {
    if (!input.confirmation) return { ok: false, code: "invalid" };
    const decision = decideCapture({ date: r.date, adults: r.adults, children: r.children, infants: r.infants, amount: p.originalAmount, currency: p.originalCurrency, heldCentavos: p.amountCentavos }, input.confirmation, false);
    if (decision.action === "needs_po") return { ok: false, code: "needs_po", reasons: decision.reasons };
  } else {
    console.info(`[pagos] cobro con OK del PO ${r.ref}: ${input.poNote ?? "sin nota"}`);
  }
  const centavos = input.captureCentavos ?? p.amountCentavos;
  if (!Number.isInteger(centavos) || centavos < MIN_CENTAVOS || centavos > p.amountCentavos) return { ok: false, code: "invalid" };
  try { await d.capture(p.paymentIntent, centavos, `capture_${p.id}`); } catch (e) { console.error(`[pagos] cobrar ${r.ref}:`, (e as Error).message); return { ok: false, code: "stripe_error" }; }
  if (!(await d.markCaptured(p.id, { paidAt: d.now, amountCentavos: centavos }))) return { ok: true, result: "captured", centavos, duplicate: true };
  await d.setRequestStatus(r.id, "paid");
  await d.sendCustomer({ to: r.email, ...buildPaidCustomerEmail(info(centavos)) }).catch((e) => console.error(`[pagos] correo cobrada ${r.ref}:`, (e as Error).message));
  await d.sendTeam(buildPaidTeamEmail(info(centavos), adminUrl)).catch((e) => console.error(`[pagos] aviso cobrada ${r.ref}:`, (e as Error).message));
  return { ok: true, result: "captured", centavos };
}
