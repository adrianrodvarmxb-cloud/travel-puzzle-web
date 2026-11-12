import { fallbackTourTitle } from "@/destinations/lib/pieza-libre-copy";
import { tripUrl } from "@/cart/lib/links";
import { buildStatusEmail, type StatusKind } from "@/notifications/lib/status-emails";
import { buildReviewRequestEmail } from "@/notifications/lib/review-email";
import { buildIcs, icsAttachment } from "@/notifications/lib/ics";
import { durationMinutes } from "./lib/schedule";
import { buildBookingConfirmationEmail, meetingPointText, mapsUrlFor, type EmailLang } from "@/notifications/lib/booking-email";
import type { BookingRecord } from "./lib/booking-record";
import type { Weather } from "@/notifications/weather";
import { filterPostTourOffers, type OfferSource } from "@/freetour/lib/promo-policy";
import { paidPolicy } from "@/tours/lib/paid-policy";
import { loadEmailCrossSell, type CrossSellLoaderDeps } from "@/notifications/cross-sell";

export interface TourSummary {
  title: string;
  provider: string | null;
  duration: string | null;
  meetingPoint: unknown;
  imageUrl?: string | null;
  galleryUrls?: string[];
  isFree?: boolean;
  rating?: { value: number; count: number } | null;
  cityName?: string | null;
  /** Id de la página del tour en el sitio (/tours/{pageId}). */
  pageId?: string;
}

export interface MoreTour {
  title: string;
  url: string;
  imageUrl: string;
  rating?: number | null;
  isFree?: boolean;
  /** REQ-081: origen del producto; sin origen cuenta como FREETOUR (falla cerrada). */
  source?: OfferSource;
}

export interface ContactConfig {
  whatsapp?: string;
  socials?: { name: string; url: string }[];
  assistantUrl?: string;
}

interface Deps {
  /** Interruptor EMAILS_ENABLED. */
  enabled: boolean;
  lang: EmailLang;
  siteUrl: string;
  getTour(tourExternalId: number, lang: EmailLang): Promise<TourSummary | null>;
  /** Reseñas reales (4–5 estrellas) de este tour, ya filtradas. */
  getReviews?(tourExternalId: number, lang: EmailLang): Promise<{ name: string; rate: number; text: string }[]>;
  /** Hasta 3 tours más en la misma ciudad (con URL completa). */
  getMoreTours?(tourExternalId: number, lang: EmailLang, siteUrl: string): Promise<MoreTour[]>;
  contact?: ContactConfig;
  /** Pronóstico del clima en el punto de encuentro a la hora del tour. */
  getWeather?(meetingPoint: unknown, eventDate: string): Promise<Weather | null>;
  /** Reloj (pruebas). */
  now?: () => Date;
  /** Invitación de calendario (.ics); sin esto no se adjunta. */
  calendar?: { organizerEmail: string };
  /**
   * REQ-081: FREETOUR_POSTTOUR_PROMO_ENABLED. En false (por omisión) «Más planes» no ofrece
   * tours de FREETOUR en ningún correo: confirmación, recordatorios, estado y post-tour (gate del PO, 5 nov 2026).
   */
  freetourPostTourPromo?: boolean;
  /** REQ-182: ARMA_TU_VIAJE_ENABLED; con "true" la confirmación enlaza a «Arma tu viaje» de esa reserva. */
  armaTuViaje?: boolean;
  /** REQ-264: venta cruzada sin FREETOUR (EMAIL_CROSS_SELL_ENABLED); sin esto, el correo sale igual que hoy. */
  crossSell?: CrossSellLoaderDeps;
  send(email: { to: string; subject: string; html: string; text: string; attachments?: { filename: string; content: string; contentType?: string }[] }): Promise<string>;
}

/** «Más planes» sin tours de FREETOUR mientras la bandera esté apagada. Nunca lanza. */
// REQ-081
async function offersFor(record: BookingRecord, deps: Pick<Deps, "lang" | "getMoreTours" | "freetourPostTourPromo">, site: string): Promise<MoreTour[]> {
  const offers = record.tourExternalId && deps.getMoreTours ? await deps.getMoreTours(record.tourExternalId, deps.lang, site).catch(() => []) : [];
  return filterPostTourOffers(offers, { postTourPromo: deps.freetourPostTourPromo === true });
}

/** Adjunto .ics de la reserva (REQUEST crea o mueve el evento; CANCEL lo borra). */
function calendarAttachment(
  method: "REQUEST" | "CANCEL",
  record: BookingRecord,
  tour: TourSummary | null,
  site: string,
  calendar: { organizerEmail: string } | undefined
) {
  if (!calendar || !record.eventUtcDate) return [];
  const ics = buildIcs({
    method,
    refNumber: record.refNumber,
    startUtc: record.eventUtcDate,
    durationMinutes: durationMinutes(tour?.duration),
    title: tour?.title ?? fallbackTourTitle(record.tourExternalId, "es"),
    location: meetingPointText(tour?.meetingPoint, "es"),
    description: `Reserva ${record.refNumber}\nVer, cambiar o cancelar: ${site}/reserva/${record.manageToken}`,
    url: `${site}/reserva/${record.manageToken}`,
    organizerEmail: calendar.organizerEmail,
    attendeeEmail: record.email,
    attendeeName: `${record.firstName} ${record.lastName}`.trim(),
    now: Date.now(),
  });
  return ics ? [icsAttachment(ics, method)] : [];
}

/** Correo de confirmación de una reserva guardada. Nunca lanza: la reserva ya está hecha. */
export async function sendBookingConfirmation(
  record: BookingRecord,
  deps: Deps,
  opts: { variant?: "confirmation" | "reminder48" | "dayOf" } = {}
): Promise<"disabled" | "sent" | "failed"> {
  if (!deps.enabled) return "disabled";
  try {
    const site = deps.siteUrl.replace(/\/+$/, "");
    const tour = record.tourExternalId ? await deps.getTour(record.tourExternalId, deps.lang).catch(() => null) : null;
    const reviews = record.tourExternalId && deps.getReviews ? await deps.getReviews(record.tourExternalId, deps.lang).catch(() => []) : [];
    const moreTours = await offersFor(record, deps, site); // REQ-081
    const weather = tour && record.eventDate && deps.getWeather ? await deps.getWeather(tour.meetingPoint, record.eventDate).catch(() => null) : null;
    const crossSell = await loadEmailCrossSell(opts.variant ?? "confirmation", record, deps.lang, site, deps.crossSell); // REQ-264
    const email = buildBookingConfirmationEmail({
      lang: deps.lang,
      refNumber: record.refNumber,
      firstName: record.firstName,
      tourTitle: tour?.title ?? fallbackTourTitle(record.tourExternalId, deps.lang),
      provider: tour?.provider ?? null,
      eventDate: record.eventDate,
      eventUtcDate: record.eventUtcDate,
      duration: tour?.duration ?? null,
      tourLanguage: record.language,
      adults: record.adults,
      children: record.children,
      meetingPoint: meetingPointText(tour?.meetingPoint, deps.lang),
      manageUrl: `${site}/reserva/${record.manageToken}`,
      logoUrl: `${site}/brand/logo-tp-oscuro.png`,
      animatedLogoUrl: `${site}/brand/logo-animado-tp-oscuro.gif`,
      weather,
      iconsBaseUrl: `${site}/brand/social`,
      now: deps.now?.() ?? new Date(),
      rating: tour?.rating ?? null,
      cityName: tour?.cityName ?? null,
      moreTours,
      // REQ-1596: invitación opcional a la cuenta, solo en la confirmación y con cuentas encendidas.
      accountUrl: process.env.NEXT_PUBLIC_ACCOUNTS_ENABLED === "true" && (opts.variant ?? "confirmation") === "confirmation" ? `${site}/mi-cuenta/entrar` : null,
      mapsUrl: mapsUrlFor(tour?.meetingPoint),
      heroImageUrl: tour?.imageUrl ?? null,
      galleryUrls: tour?.galleryUrls ?? [],
      reviews,
      // REQ-812: lo cobrado manda; un free tour que pasó a tarifa fija ya no es «a propina».
      // REQ-938 (D7): con pago a la llegada se cobra 0 hoy, pero el tour es de pago (fullPrice).
      isFree: groupPrice(record) > 0 ? false : (tour?.isFree ?? true),
      paidPolicy: groupPrice(record) > 0 ? (({ cancel, noShow }) => ({ cancel, noShow }))(paidPolicy({ fullPrice: groupPrice(record), payNow: record.price, isPartiallyPaid: record.price > 0 && record.price < groupPrice(record), currency: "EUR" }, deps.lang)) : null,
      contact: deps.contact,
      variant: opts.variant,
      // REQ-182
      tripUrl: tripUrl({ site, token: record.manageToken, enabled: deps.armaTuViaje === true, status: record.status }),
      crossSell,
    });
    const attachments = !opts.variant || opts.variant === "confirmation" ? calendarAttachment("REQUEST", record, tour, site, deps.calendar) : [];
    await deps.send({ to: record.email, ...email, ...(attachments.length && { attachments }) });
    return "sent";
  } catch (error) {
    console.error(`[correo] no se envió la confirmación de ${record.refNumber}:`, (error as Error).message);
    return "failed";
  }
}

type StatusDeps = Pick<Deps, "enabled" | "lang" | "siteUrl" | "getTour" | "getMoreTours" | "contact" | "send" | "calendar" | "freetourPostTourPromo" | "crossSell" | "now">;

/** REQ-938: precio total del grupo (fullPrice del cobro) o, en reservas sin cobro guardado, el precio registrado. */
function groupPrice(record: BookingRecord): number {
  const full = (record as BookingRecord & { fullPrice?: number | null }).fullPrice;
  return typeof full === "number" && full > 0 ? full : record.price;
}

/** REQ-936: hubo cobro si tiene precio y el pago no está pendiente ni vencido (sin columna de pago = reserva previa al cobro). */
function chargedSoFar(record: BookingRecord): boolean {
  const ps = (record as BookingRecord & { paymentStatus?: string | null }).paymentStatus;
  return record.price > 0 && ps !== "pending" && ps !== "expired" && ps !== "expired_manual" && ps !== "canceled" && ps !== "review" && ps !== "arrival";
}

/** REQ-811 (D3): con 24 h o más antes del tour, reembolso; menos, no. Sin fecha UTC no se afirma nada. */
export function refundFor(eventUtcDate: string | null | undefined, now: Date): "full" | "none" | null {
  const t = eventUtcDate ? Date.parse(`${eventUtcDate.trim().replace(" ", "T")}${/[zZ]|[+-]\d\d:?\d\d$/.test(eventUtcDate.trim()) ? "" : "Z"}`) : NaN;
  if (!Number.isFinite(t)) return null;
  return t - now.getTime() >= 24 * 3600 * 1000 ? "full" : "none";
}

/** Correo de rechazo, cancelación o cambio de una reserva guardada. Nunca lanza. */
export async function sendStatusEmail(
  kind: StatusKind,
  record: BookingRecord,
  deps: StatusDeps,
  extra: { reason?: string | null } = {}
): Promise<"disabled" | "sent" | "failed"> {
  if (!deps.enabled) return "disabled";
  try {
    const site = deps.siteUrl.replace(/\/+$/, "");
    const tour = record.tourExternalId ? await deps.getTour(record.tourExternalId, deps.lang).catch(() => null) : null;
    const moreTours = await offersFor(record, deps, site); // REQ-081
    // REQ-262: nunca en rechazo ni cancelación; solo el cambio de una reserva que sigue activa.
    const crossSell = kind === "modified" ? await loadEmailCrossSell("modified", record, deps.lang, site, deps.crossSell) : null;
    const email = buildStatusEmail({
      kind,
      lang: deps.lang,
      refNumber: record.refNumber,
      firstName: record.firstName,
      tourTitle: tour?.title ?? fallbackTourTitle(record.tourExternalId, deps.lang),
      eventDate: record.eventDate,
      eventUtcDate: record.eventUtcDate,
      duration: tour?.duration ?? null,
      tourLanguage: record.language,
      adults: record.adults,
      children: record.children,
      meetingPoint: meetingPointText(tour?.meetingPoint, deps.lang),
      reason: extra.reason ?? null,
      manageUrl: `${site}/reserva/${record.manageToken}`,
      tourUrl: tour?.pageId ? `${site}/tours/${tour.pageId}` : `${site}/tours`,
      cityName: tour?.cityName ?? null,
      moreTours,
      logoUrl: `${site}/brand/logo-tp-oscuro.png`,
      animatedLogoUrl: `${site}/brand/logo-animado-tp-oscuro.gif`,
      iconsBaseUrl: `${site}/brand/social`,
      contact: deps.contact,
      crossSell,
      // REQ-811; REQ-936: una reserva de pago aún sin pagar (o vencida) no tiene nada que reembolsar.
      paid: chargedSoFar(record),
      refund: chargedSoFar(record) && kind === "canceled" ? refundFor(record.eventUtcDate, deps.now?.() ?? new Date()) : null,
    });
    const attachments = calendarAttachment(kind === "modified" ? "REQUEST" : "CANCEL", record, tour, site, deps.calendar);
    await deps.send({ to: record.email, ...email, ...(attachments.length && { attachments }) });
    return "sent";
  } catch (error) {
    console.error(`[correo] no se envió el aviso (${kind}) de ${record.refNumber}:`, (error as Error).message);
    return "failed";
  }
}

/**
 * Correo post-tour: reseña en un clic y siguiente plan. Nunca lanza.
 * REQ-081: el siguiente plan no ofrece tours de FREETOUR mientras FREETOUR_POSTTOUR_PROMO_ENABLED
 * esté apagada (`freetourPostTourPromo` en false por omisión).
 */
export async function sendReviewRequest(
  record: BookingRecord,
  deps: StatusDeps
): Promise<"disabled" | "sent" | "failed"> {
  if (!deps.enabled) return "disabled";
  try {
    const site = deps.siteUrl.replace(/\/+$/, "");
    const tour = record.tourExternalId ? await deps.getTour(record.tourExternalId, deps.lang).catch(() => null) : null;
    const moreTours = await offersFor(record, deps, site); // REQ-081
    const crossSell = await loadEmailCrossSell("review", record, deps.lang, site, deps.crossSell); // REQ-264
    const email = buildReviewRequestEmail({
      lang: deps.lang,
      refNumber: record.refNumber,
      firstName: record.firstName,
      tourTitle: tour?.title ?? fallbackTourTitle(record.tourExternalId, deps.lang),
      reviewUrl: `${site}/reserva/${record.manageToken}/resena`,
      cityName: tour?.cityName ?? null,
      moreTours,
      logoUrl: `${site}/brand/logo-tp-oscuro.png`,
      animatedLogoUrl: `${site}/brand/logo-animado-tp-oscuro.gif`,
      iconsBaseUrl: `${site}/brand/social`,
      contact: deps.contact,
      crossSell,
    });
    await deps.send({ to: record.email, ...email });
    return "sent";
  } catch (error) {
    console.error(`[correo] no se envió la petición de reseña de ${record.refNumber}:`, (error as Error).message);
    return "failed";
  }
}
