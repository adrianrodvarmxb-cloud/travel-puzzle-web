import { buildStatusEmail, type StatusKind } from "@/notifications/lib/status-emails";
import { buildReviewRequestEmail } from "@/notifications/lib/review-email";
import { buildIcs, icsAttachment } from "@/notifications/lib/ics";
import { durationMinutes } from "./lib/schedule";
import { buildBookingConfirmationEmail, meetingPointText, mapsUrlFor, type EmailLang } from "@/notifications/lib/booking-email";
import type { BookingRecord } from "./lib/booking-record";
import type { Weather } from "@/notifications/weather";

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

export interface MoreTour { title: string; url: string; imageUrl: string; rating?: number | null; isFree?: boolean }

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
  send(email: { to: string; subject: string; html: string; text: string; attachments?: { filename: string; content: string; contentType?: string }[] }): Promise<string>;
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
    title: tour?.title ?? `Free tour ${record.tourExternalId ?? ""}`.trim(),
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
    const moreTours = record.tourExternalId && deps.getMoreTours ? await deps.getMoreTours(record.tourExternalId, deps.lang, site).catch(() => []) : [];
    const weather = tour && record.eventDate && deps.getWeather ? await deps.getWeather(tour.meetingPoint, record.eventDate).catch(() => null) : null;
    const email = buildBookingConfirmationEmail({
      lang: deps.lang,
      refNumber: record.refNumber,
      firstName: record.firstName,
      tourTitle: tour?.title ?? `Free tour ${record.tourExternalId ?? ""}`.trim(),
      provider: tour?.provider ?? null,
      eventDate: record.eventDate,
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
      mapsUrl: mapsUrlFor(tour?.meetingPoint),
      heroImageUrl: tour?.imageUrl ?? null,
      galleryUrls: tour?.galleryUrls ?? [],
      reviews,
      isFree: tour?.isFree ?? record.price === 0,
      contact: deps.contact,
      variant: opts.variant,
    });
    const attachments = !opts.variant || opts.variant === "confirmation" ? calendarAttachment("REQUEST", record, tour, site, deps.calendar) : [];
    await deps.send({ to: record.email, ...email, ...(attachments.length && { attachments }) });
    return "sent";
  } catch (error) {
    console.error(`[correo] no se envió la confirmación de ${record.refNumber}:`, (error as Error).message);
    return "failed";
  }
}

type StatusDeps = Pick<Deps, "enabled" | "lang" | "siteUrl" | "getTour" | "getMoreTours" | "contact" | "send" | "calendar">;

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
    const moreTours = record.tourExternalId && deps.getMoreTours ? await deps.getMoreTours(record.tourExternalId, deps.lang, site).catch(() => []) : [];
    const email = buildStatusEmail({
      kind,
      lang: deps.lang,
      refNumber: record.refNumber,
      firstName: record.firstName,
      tourTitle: tour?.title ?? `Free tour ${record.tourExternalId ?? ""}`.trim(),
      eventDate: record.eventDate,
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
    });
    const attachments = calendarAttachment(kind === "modified" ? "REQUEST" : "CANCEL", record, tour, site, deps.calendar);
    await deps.send({ to: record.email, ...email, ...(attachments.length && { attachments }) });
    return "sent";
  } catch (error) {
    console.error(`[correo] no se envió el aviso (${kind}) de ${record.refNumber}:`, (error as Error).message);
    return "failed";
  }
}

/** Correo post-tour: reseña en un clic y siguiente plan. Nunca lanza. */
export async function sendReviewRequest(record: BookingRecord, deps: StatusDeps): Promise<"disabled" | "sent" | "failed"> {
  if (!deps.enabled) return "disabled";
  try {
    const site = deps.siteUrl.replace(/\/+$/, "");
    const tour = record.tourExternalId ? await deps.getTour(record.tourExternalId, deps.lang).catch(() => null) : null;
    const moreTours = record.tourExternalId && deps.getMoreTours ? await deps.getMoreTours(record.tourExternalId, deps.lang, site).catch(() => []) : [];
    const email = buildReviewRequestEmail({
      lang: deps.lang,
      refNumber: record.refNumber,
      firstName: record.firstName,
      tourTitle: tour?.title ?? `Free tour ${record.tourExternalId ?? ""}`.trim(),
      reviewUrl: `${site}/reserva/${record.manageToken}/resena`,
      cityName: tour?.cityName ?? null,
      moreTours,
      logoUrl: `${site}/brand/logo-tp-oscuro.png`,
      animatedLogoUrl: `${site}/brand/logo-animado-tp-oscuro.gif`,
      iconsBaseUrl: `${site}/brand/social`,
      contact: deps.contact,
    });
    await deps.send({ to: record.email, ...email });
    return "sent";
  } catch (error) {
    console.error(`[correo] no se envió la petición de reseña de ${record.refNumber}:`, (error as Error).message);
    return "failed";
  }
}
