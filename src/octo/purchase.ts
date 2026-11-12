/**
 * Ola 3: compra directa de Big Bus por OCTO. Orquesta apartar → cobrar con Stripe → confirmar → boleto.
 * Todas las dependencias entran por parámetro (deps.ts arma las reales). Sin bandera, nada corre.
 */
import type { OctoApi } from "./api";
import type { CatalogPlan } from "./lib/catalog";
import { deliverables, type Delivery } from "./lib/booking-flow";
import { checkAgainstPlan, paxCounts, pickAvailability, purchaseTotal, stripeSessionExpiry, unitsText, type PurchaseInput } from "./lib/purchase";
import { buildCancelCustomerEmail, buildOctoTeamEmail, buildTicketEmail } from "./lib/ticket-email";
import { buildCheckoutParams, chargeAmount } from "@/payments/lib/checkout";
import type { FxRates } from "@/trips/lib/money";

type Mail = { to: string; subject: string; html: string; text: string };

/** Fila de la tabla OctoBooking (migración 0027). */
export interface OctoBookingRow {
  id: string;
  requestId: string;
  paymentId: string;
  uuid: string;
  productId: string;
  optionId: string;
  availabilityId: string;
  status: "ON_HOLD" | "CONFIRMED" | "RELEASED" | "CONFIRM_FAILED" | "CANCELLED" | "FAILED";
  supplierReference: string | null;
  delivery: Delivery | null;
  expiresAt: string | null;
}

export interface RequestInfo {
  id: string;
  ref: string;
  tripTitle: string;
  date: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  optionName: string | null;
  adults: number;
  children: number;
  infants: number;
}

/** «2 adultos, 1 niño» para el correo. */
export function paxLabel(r: Pick<RequestInfo, "adults" | "children" | "infants">): string {
  const part = (n: number, one: string, many: string) => (n ? `${n} ${n === 1 ? one : many}` : "");
  return [part(r.adults, "adulto", "adultos"), part(r.children, "niño", "niños"), part(r.infants, "infante", "infantes")].filter(Boolean).join(", ");
}

export interface PurchaseDeps {
  now: Date;
  siteUrl: string;
  logoUrl: string;
  cushionPct: number;
  /** null = BIGBUS_OCTO_ENABLED apagada o sin llave. */
  api: Pick<OctoApi, "availability" | "reserve" | "confirm" | "cancel" | "getBooking"> | null;
  stripeEnabled: boolean;
  newUuid(): string;
  newId(prefix: string): string;
  newRef(): string;
  loadPlan(): Promise<CatalogPlan | null>;
  getRates(): Promise<FxRates | null>;
  tripIdFor(ref: string): string;
  saveRequest(row: Record<string, unknown>): Promise<void>;
  setRequestStatus(id: string, status: string): Promise<unknown>;
  findRequest(id: string): Promise<RequestInfo | null>;
  findRequestByRef(ref: string, email: string): Promise<RequestInfo | null>;
  createSession(params: Record<string, string>): Promise<{ id: string; url: string }>;
  insertPayment(row: Record<string, unknown>): Promise<unknown>;
  insertBooking(row: OctoBookingRow): Promise<unknown>;
  updateBooking(id: string, patch: Partial<OctoBookingRow>): Promise<unknown>;
  findBookingByRequest(requestId: string): Promise<OctoBookingRow | null>;
  findBookingByPayment(paymentId: string): Promise<OctoBookingRow | null>;
  sendCustomer(m: Mail): Promise<unknown>;
  sendTeam(m: Omit<Mail, "to">): Promise<unknown>;
}

export type StartResult =
  | { ok: true; url: string; ref: string }
  | {
      ok: false;
      code: "disabled" | "not_found" | "bad_units" | "past_date" | "sold_out" | "unsupported_currency" | "no_price" | "no_fx" | "invalid_amount" | "reserve_failed" | "stripe_error";
    };

const log = (msg: string, e: unknown) => console.error(`[bigbus-octo] ${msg}:`, (e as Error)?.message ?? e);

/** Aparta en Big Bus y abre el cobro. Si algo falla después de apartar, libera el apartado por API. */
// REQ-3418
export async function startPurchase(i: PurchaseInput, d: PurchaseDeps): Promise<StartResult> {
  if (!d.api || !d.stripeEnabled) return { ok: false, code: "disabled" };
  const check = checkAgainstPlan(i, await d.loadPlan(), d.now.toISOString().slice(0, 10));
  if (!check.ok) return check;

  // REQ-3436: precios y reserva en la moneda elegida para el producto (USD si Big Bus la ofrece).
  const currency = check.product.currency ?? undefined;
  let avail;
  try {
    const r = await d.api.availability({ productId: i.productId, optionId: i.optionId, localDateStart: i.date, localDateEnd: i.date, units: i.units, currency });
    avail = pickAvailability(r.items, i.date);
  } catch (e) {
    log("disponibilidad", e);
    return { ok: false, code: "sold_out" };
  }
  if (!avail) return { ok: false, code: "sold_out" };
  const total = purchaseTotal(avail);
  if (!total.ok) return total;
  const rates = total.currency === "MXN" ? null : await d.getRates();
  if (total.currency !== "MXN" && !rates) return { ok: false, code: "no_fx" };
  const charge = chargeAmount(total.amount, total.currency, rates, d.cushionPct);
  if (!charge) return { ok: false, code: "invalid_amount" };

  const requestId = d.newId("req");
  const ref = d.newRef();
  const title = `${check.product.name} · ${check.option.name}`;
  const pax = paxCounts(check.option, i.units);
  await d.saveRequest({
    id: requestId, ref, tripId: d.tripIdFor(i.ref), tripCode: i.ref, tripTitle: title, kind: "compra", status: "holding",
    date: i.date, time: "", serviceType: "group", optionId: i.optionId, optionName: check.option.name,
    adults: pax.adults, children: pax.children, infants: pax.infants, childAges: [],
    firstName: i.firstName, lastName: i.lastName, email: i.email, phone: i.phone, language: i.language,
    estimate: total.amount, currency: total.currency, consent: true, notes: `Compra directa Big Bus (OCTO): ${unitsText(check.option, i.units)}`,
  });

  const uuid = d.newUuid();
  let hold;
  try {
    hold = await d.api.reserve({ uuid, productId: i.productId, optionId: i.optionId, availabilityId: avail.id, units: i.units, resellerReference: ref, currency });
  } catch (e) {
    log(`apartado ${ref}`, e);
    await d.setRequestStatus(requestId, "failed");
    return { ok: false, code: "reserve_failed" };
  }

  const paymentId = d.newId("pay");
  const expiresAt = stripeSessionExpiry(d.now);
  let session: { id: string; url: string };
  try {
    const params = buildCheckoutParams({ paymentId, requestId, ref, tripTitle: title, kind: "total", centavos: charge.centavos, email: i.email, siteUrl: d.siteUrl, expiresAt });
    session = await d.createSession(params);
  } catch (e) {
    log(`Stripe ${ref}`, e);
    await d.api.cancel(uuid, "No se pudo abrir el pago").catch((x) => log(`liberar apartado ${ref}`, x));
    await d.setRequestStatus(requestId, "failed");
    return { ok: false, code: "stripe_error" };
  }

  await d.insertPayment({
    id: paymentId, requestId, kind: "total", amountCentavos: charge.centavos, currency: "MXN", originalAmount: total.amount, originalCurrency: total.currency,
    fxRate: charge.fxRate, fxCushionPct: total.currency === "MXN" ? 0 : d.cushionPct, stripeSessionId: session.id, checkoutUrl: session.url,
    expiresAt: new Date(expiresAt * 1000), status: "pending",
  });
  await d.insertBooking({
    id: d.newId("oct"), requestId, paymentId, uuid, productId: i.productId, optionId: i.optionId, availabilityId: avail.id,
    status: "ON_HOLD", supplierReference: hold.supplierReference, delivery: null, expiresAt: hold.utcExpiresAt,
  });
  return { ok: true, url: session.url, ref };
}

export type PaidResult = "not_octo" | "confirmed" | "needs_attention" | "already";

/**
 * Después del cobro (webhook de Stripe): confirma en Big Bus y manda el boleto. Si Big Bus no confirma,
 * avisa al equipo para resolver a mano. No reembolsa solo: el reembolso es decisión del equipo (candado de pagos).
 */
// REQ-3419
export async function onPurchasePaid(requestId: string, d: PurchaseDeps): Promise<PaidResult> {
  const b = await d.findBookingByRequest(requestId);
  if (!b) return "not_octo";
  if (b.status === "CONFIRMED") return "already";
  const req = await d.findRequest(requestId);
  if (!d.api || !req) {
    await alertTeam(d, req?.ref ?? requestId, "Pago recibido pero la conexión con Big Bus está apagada", b);
    await d.updateBooking(b.id, { status: "CONFIRM_FAILED" });
    return "needs_attention";
  }
  try {
    const confirmed = await d.api.confirm(b.uuid, {
      contact: { fullName: `${req.firstName} ${req.lastName}`, emailAddress: req.email, phoneNumber: req.phone, locales: ["es"] },
      resellerReference: req.ref,
    });
    const delivery = deliverables(confirmed);
    if (confirmed.status !== "CONFIRMED" || delivery.items.length === 0) throw new Error(`estado ${confirmed.status}, ${delivery.items.length} códigos`);
    await d.updateBooking(b.id, { status: "CONFIRMED", supplierReference: confirmed.supplierReference, delivery });
    await d.setRequestStatus(requestId, "confirmed");
    const pax = [req.optionName, paxLabel(req)].filter(Boolean).join(" · ");
    await d
      .sendCustomer({ to: req.email, ...buildTicketEmail({ ref: req.ref, title: req.tripTitle, date: req.date, pax, firstName: req.firstName, logoUrl: d.logoUrl }, delivery) })
      .catch((e) => log(`correo del boleto ${req.ref}`, e));
    return "confirmed";
  } catch (e) {
    log(`confirmar ${req.ref}`, e);
    await d.updateBooking(b.id, { status: "CONFIRM_FAILED" });
    await d.setRequestStatus(requestId, "needs_attention");
    await alertTeam(d, req.ref, "Pago recibido pero Big Bus no confirmó la compra", b, (e as Error)?.message);
    return "needs_attention";
  }
}

async function alertTeam(d: PurchaseDeps, ref: string, subject: string, b: OctoBookingRow, detail?: string) {
  const lines = [
    `Folio: ${ref}`,
    `Reserva OCTO (uuid): ${b.uuid}`,
    `Producto: ${b.productId} · opción ${b.optionId}`,
    detail ? `Detalle: ${detail}` : "",
    "",
    "Qué hacer: reservar a mano en el Partner Booking Platform o reembolsar al cliente según la política de Travel Puzzle.",
    `Panel: ${d.siteUrl}/admin/solicitudes`,
  ].filter((l) => l !== "");
  await d.sendTeam(buildOctoTeamEmail(`${subject} · ${ref}`, lines, d.logoUrl)).catch((e) => log(`aviso al equipo ${ref}`, e));
}

/** La sesión de Stripe venció sin pago: se libera el apartado por API (regla de Ventrata). */
// REQ-3419
export async function onPurchaseExpired(paymentId: string, d: PurchaseDeps): Promise<"not_octo" | "released" | "skipped"> {
  const b = await d.findBookingByPayment(paymentId);
  if (!b) return "not_octo";
  if (b.status !== "ON_HOLD" || !d.api) return "skipped";
  await d.api.cancel(b.uuid, "Pago no completado").catch((e) => log(`liberar ${b.uuid}`, e));
  await d.updateBooking(b.id, { status: "RELEASED" });
  await d.setRequestStatus(b.requestId, "expired");
  return "released";
}

export type CancelResult = "disabled" | "not_found" | "not_cancellable" | "cancelled" | "error";

/**
 * El cliente cancela: solo si Big Bus dice que todavía se puede (`cancellable`, según el corte de la opción).
 * Se cancela en Big Bus por API y se avisa al equipo para el reembolso (la política la define el PO, REQ-3425).
 */
// REQ-3421
export async function cancelPurchase(p: { ref: string; email: string }, d: PurchaseDeps): Promise<CancelResult> {
  if (!d.api) return "disabled";
  const req = await d.findRequestByRef(p.ref, p.email.trim().toLowerCase());
  const b = req ? await d.findBookingByRequest(req.id) : null;
  if (!req || !b || b.status !== "CONFIRMED") return "not_found";
  try {
    const live = await d.api.getBooking(b.uuid);
    if (!live.cancellable) return "not_cancellable";
    await d.api.cancel(b.uuid, "Cancelación del cliente");
  } catch (e) {
    log(`cancelar ${req.ref}`, e);
    return "error";
  }
  await d.updateBooking(b.id, { status: "CANCELLED" });
  await d.setRequestStatus(req.id, "cancel_refund_pending");
  await d.sendCustomer({ to: req.email, ...buildCancelCustomerEmail({ ref: req.ref, title: req.tripTitle, firstName: req.firstName, logoUrl: d.logoUrl }) }).catch((e) => log(`correo de cancelación ${req.ref}`, e));
  await alertTeam(d, req.ref, "Cancelación de compra directa: procesar el reembolso", b);
  return "cancelled";
}
