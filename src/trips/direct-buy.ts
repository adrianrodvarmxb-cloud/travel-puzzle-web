/**
 * REQ-3533 / REQ-3534: compra directa de un viaje de proveedor. Orquesta cobro automático con Stripe →
 * aviso al proveedor → confirmación o reembolso automático (por «No hay lugar» o a las 48 h sin respuesta).
 * Nada espera aprobación del equipo: el equipo solo recibe avisos. Dependencias por parámetro.
 */
import { isDateOpen, availableTimes, estimate, requestRef } from "./lib/request";
import type { TripOption, Season } from "./lib/pricing";
import type { FxRates } from "./lib/money";
import type { RequestInput } from "./schemas/request";
import { buildCheckoutParams, chargeAmount, sessionExpiry } from "@/payments/lib/checkout";
import { canBuyDirect, decide, isPastDeadline, signSupplierLink, supplierLink, verifySupplierLink, type SupplierAction } from "./lib/direct-buy";
import {
  buildBuyConfirmedCustomerEmail, buildBuyPaidCustomerEmail, buildBuyRefundedCustomerEmail, buildBuyTeamEmail, buildSupplierRequestEmail, type BuyMailInput,
} from "./lib/direct-buy-email";

type Mail = { to: string; subject: string; html: string; text: string };

export interface BuyTrip {
  id: string; code: string; titleEs: string; kind: string; purchaseMode: string; currency: "MXN" | "USD" | "EUR"; minNoticeHours: number;
  options: TripOption[]; availability: { weekdays: number[]; slots: { time: string; capacity: number | null }[]; closedDates: string[]; seasons: Season[] };
}

/** Solicitud de compra con su pago cobrado (si lo hay) y el correo del proveedor. */
export interface BuyRecord {
  id: string; ref: string; kind: string; status: string; tripTitle: string; tripCode: string;
  date: string; time: string; optionName: string | null; adults: number; children: number; infants: number;
  firstName: string; lastName: string; email: string; hotel: string; supplierEmail: string | null;
  payment: { id: string; paymentIntent: string | null; amountCentavos: number; paidAt: Date | null } | null;
}

export interface BuyDeps {
  now: Date; siteUrl: string; logoUrl: string; cushionPct: number; secret: string;
  enabled: boolean; stripeEnabled: boolean;
  newId(prefix: string): string; random(): string;
  findTrip(id: string): Promise<BuyTrip | null>;
  getRates(): Promise<FxRates | null>;
  saveRequest(row: Record<string, unknown>): Promise<void>;
  createSession(params: Record<string, string>): Promise<{ id: string; url: string }>;
  insertPayment(row: Record<string, unknown>): Promise<unknown>;
  findBuy(requestId: string): Promise<BuyRecord | null>;
  /** Cambio condicional de estado: true solo si estaba en uno de `from` (evita dobles decisiones). */
  transition(requestId: string, from: string[], to: string): Promise<boolean>;
  refund(paymentIntent: string, idempotencyKey: string): Promise<{ id: string }>;
  listAwaitingSupplier(): Promise<{ id: string; paidAt: Date | null }[]>;
  sendCustomer(m: Mail): Promise<unknown>;
  sendSupplier(m: Mail): Promise<unknown>;
  sendTeam(m: Omit<Mail, "to">): Promise<unknown>;
}

export type StartBuyResult =
  | { ok: true; url: string; ref: string }
  | { ok: false; code: "disabled" | "not_found" | "bad_date" | "bad_time" | "bad_ages" | "no_price" | "no_fx" | "invalid_amount" | "stripe_error"; error: string };

const fail = (code: Extract<StartBuyResult, { ok: false }>["code"], error: string): StartBuyResult => ({ ok: false, code, error });
const log = (msg: string, e: unknown) => console.error(`[compra-directa] ${msg}:`, (e as Error)?.message ?? e);

const paxText = (r: { adults: number; children: number; infants: number }) =>
  [`${r.adults} ${r.adults === 1 ? "adulto" : "adultos"}`, r.children ? `${r.children} ${r.children === 1 ? "niño" : "niños"}` : "", r.infants ? `${r.infants} ${r.infants === 1 ? "infante" : "infantes"}` : ""]
    .filter(Boolean).join(", ");

// REQ-3533: valida contra el viaje, cobra el total que calcula el sistema y abre Stripe Checkout. Sin aprobación.
export async function startDirectBuy(r: Extract<RequestInput, { kind: "reserva" }>, d: BuyDeps): Promise<StartBuyResult> {
  const trip = await d.findTrip(r.tripId);
  if (!trip) return fail("not_found", "Este viaje ya no está disponible.");
  if (!canBuyDirect(trip, { enabled: d.enabled, stripe: d.stripeEnabled })) return fail("disabled", "Este viaje se reserva por solicitud.");
  if (!isDateOpen(r.date, trip.availability, trip.minNoticeHours, d.now)) return fail("bad_date", "Esa fecha no está disponible. Elige otra.");
  const times = availableTimes(r.date, trip.availability, trip.minNoticeHours, d.now);
  if (times.length && !times.includes(r.time)) return fail("bad_time", "Ese horario no está disponible.");
  const option = trip.options.find((o) => o.id === r.optionId) ?? trip.options[0] ?? null;
  if (option && r.childAges.some((a) => a < option.childAgeMin || a > option.childAgeMax)) {
    return fail("bad_ages", `Los niños de esta opción son de ${option.childAgeMin} a ${option.childAgeMax} años; los mayores cuentan como adultos.`);
  }
  const total = estimate(option, r, r.date, trip.availability.seasons);
  if (total === null || total <= 0) return fail("no_price", "Este viaje no tiene precio completo para esa opción; envía una solicitud.");
  const rates = trip.currency === "MXN" ? null : await d.getRates();
  if (trip.currency !== "MXN" && !rates) return fail("no_fx", "No pudimos calcular el tipo de cambio. Intenta en unos minutos.");
  const charge = chargeAmount(total, trip.currency, rates, d.cushionPct);
  if (!charge) return fail("invalid_amount", "El monto no es válido para cobrar con tarjeta.");

  const requestId = d.newId("req");
  const ref = requestRef(d.now, d.random());
  await d.saveRequest({
    id: requestId, ref, tripId: trip.id, tripCode: trip.code, tripTitle: trip.titleEs, kind: "compra", status: "awaiting_payment",
    date: r.date, endDate: null, time: r.time, serviceType: option?.mode ?? null, optionId: option?.id ?? null, optionName: option?.name ?? null,
    adults: r.adults, children: r.children, infants: r.infants, childAges: r.childAges,
    firstName: r.firstName, lastName: r.lastName, email: r.email, phone: r.phone, hotel: r.hotel, comments: r.comments, language: r.language,
    estimate: total, currency: trip.currency, consent: true, notes: "Compra directa (REQ-3533)",
  });

  const paymentId = d.newId("pay");
  const expiresAt = sessionExpiry(d.now);
  let session: { id: string; url: string };
  try {
    session = await d.createSession(buildCheckoutParams({ paymentId, requestId, ref, tripTitle: trip.titleEs, kind: "total", centavos: charge.centavos, email: r.email, siteUrl: d.siteUrl, expiresAt }));
  } catch (e) {
    log(`Stripe ${ref}`, e);
    await d.transition(requestId, ["awaiting_payment"], "failed");
    return fail("stripe_error", "No pudimos abrir el pago. Intenta de nuevo en unos minutos.");
  }
  await d.insertPayment({
    id: paymentId, requestId, kind: "total", amountCentavos: charge.centavos, currency: "MXN", originalAmount: total, originalCurrency: trip.currency,
    fxRate: charge.fxRate, fxCushionPct: trip.currency === "MXN" ? 0 : d.cushionPct, stripeSessionId: session.id, checkoutUrl: session.url,
    expiresAt: new Date(expiresAt * 1000), status: "pending",
  });
  return { ok: true, url: session.url, ref };
}

function mailInput(b: BuyRecord, logoUrl: string): BuyMailInput {
  return {
    ref: b.ref, tripTitle: b.tripTitle, tripCode: b.tripCode, firstName: b.firstName, lastName: b.lastName, date: b.date, time: b.time,
    optionName: b.optionName, pax: paxText(b), hotel: b.hotel, centavos: b.payment?.amountCentavos ?? 0, logoUrl,
  };
}

// REQ-3533 / REQ-3534: después del pago (webhook). true = era compra directa (el webhook omite el correo genérico).
export async function onDirectBuyPaid(requestId: string, d: BuyDeps): Promise<boolean> {
  const b = await d.findBuy(requestId);
  if (!b || b.kind !== "compra") return false;
  // El webhook ya la marcó «paid»; si Stripe repite el aviso, la transición falla y no se repiten los correos.
  if (!(await d.transition(requestId, ["awaiting_payment", "paid"], "awaiting_supplier"))) return true;
  const i = mailInput(b, d.logoUrl);
  await d.sendCustomer({ to: b.email, ...buildBuyPaidCustomerEmail(i) }).catch((e) => log(`correo de pago ${b.ref}`, e));
  if (b.supplierEmail) {
    const link = supplierLink(d.siteUrl, b.id, await signSupplierLink(d.secret, b.id));
    await d.sendSupplier({ to: b.supplierEmail, ...buildSupplierRequestEmail(i, link) }).catch((e) => log(`correo al proveedor ${b.ref}`, e));
    await d.sendTeam(buildBuyTeamEmail(i, "Pagada, esperando al proveedor", `Se le pidió confirmación a ${b.supplierEmail}.`)).catch((e) => log(`aviso equipo ${b.ref}`, e));
  } else {
    await d.sendTeam(buildBuyTeamEmail(i, "Pagada, proveedor sin correo", "La agencia no tiene correo en el gestor: pide confirmación por otro medio. A las 48 h sin confirmar se reembolsa sola.")).catch((e) => log(`aviso equipo ${b.ref}`, e));
  }
  return true;
}

export type DecisionResult = "confirmed" | "refunded" | "refund_failed" | "already" | "invalid";

// REQ-3534: decisión del proveedor (enlace firmado) o vencimiento de las 48 h.
export async function applySupplierDecision(requestId: string, action: SupplierAction, d: BuyDeps, sig?: string): Promise<DecisionResult> {
  if (action !== "timeout" && !(await verifySupplierLink(d.secret, requestId, sig ?? ""))) return "invalid";
  const b = await d.findBuy(requestId);
  if (!b || b.kind !== "compra") return "invalid";
  const dec = decide(b.status, action);
  if (!dec || !(await d.transition(requestId, ["awaiting_supplier"], dec.next))) return "already";
  const i = mailInput(b, d.logoUrl);
  if (!dec.refund) {
    await d.sendCustomer({ to: b.email, ...buildBuyConfirmedCustomerEmail(i) }).catch((e) => log(`correo confirmado ${b.ref}`, e));
    await d.sendTeam(buildBuyTeamEmail(i, "Confirmada por el proveedor")).catch((e) => log(`aviso equipo ${b.ref}`, e));
    return "confirmed";
  }
  const why = action === "timeout" ? "El proveedor no contestó en 48 h" : "El proveedor indicó que no hay lugar";
  try {
    if (!b.payment?.paymentIntent) throw new Error("sin payment_intent");
    await d.refund(b.payment.paymentIntent, `reembolso-${b.payment.id}`);
  } catch (e) {
    log(`reembolso ${b.ref}`, e);
    await d.transition(requestId, ["refunding"], "refund_failed");
    await d.sendTeam(buildBuyTeamEmail(i, "REEMBOLSO FALLÓ", `${why}. Stripe no hizo el reembolso (${(e as Error)?.message ?? e}). Hazlo a mano en Stripe.`)).catch((x) => log(`aviso equipo ${b.ref}`, x));
    return "refund_failed";
  }
  await d.transition(requestId, ["refunding"], "refunded");
  await d.sendCustomer({ to: b.email, ...buildBuyRefundedCustomerEmail(i) }).catch((e) => log(`correo reembolso ${b.ref}`, e));
  await d.sendTeam(buildBuyTeamEmail(i, "Reembolsada", `${why}; se devolvió el total automáticamente.`)).catch((e) => log(`aviso equipo ${b.ref}`, e));
  return "refunded";
}

// REQ-3534: cron; reembolsa las compras que pasaron 48 h sin respuesta del proveedor.
export async function refundOverdue(d: BuyDeps): Promise<{ checked: number; refunded: number; failed: number }> {
  const out = { checked: 0, refunded: 0, failed: 0 };
  for (const row of await d.listAwaitingSupplier()) {
    out.checked++;
    if (!row.paidAt || !isPastDeadline(row.paidAt, d.now)) continue;
    const r = await applySupplierDecision(row.id, "timeout", d);
    if (r === "refunded") out.refunded++;
    if (r === "refund_failed") out.failed++;
  }
  return out;
}
