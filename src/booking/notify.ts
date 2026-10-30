import { buildBookingConfirmationEmail, meetingPointText, type EmailLang } from "@/notifications/lib/booking-email";
import type { BookingRecord } from "./lib/booking-record";

export interface TourSummary {
  title: string;
  provider: string | null;
  duration: string | null;
  meetingPoint: unknown;
}

interface Deps {
  /** Interruptor EMAILS_ENABLED. */
  enabled: boolean;
  lang: EmailLang;
  siteUrl: string;
  getTour(tourExternalId: number, lang: EmailLang): Promise<TourSummary | null>;
  send(email: { to: string; subject: string; html: string; text: string }): Promise<string>;
}

/** Correo de confirmación de una reserva guardada. Nunca lanza: la reserva ya está hecha. */
export async function sendBookingConfirmation(record: BookingRecord, deps: Deps): Promise<"disabled" | "sent" | "failed"> {
  if (!deps.enabled) return "disabled";
  try {
    const tour = record.tourExternalId ? await deps.getTour(record.tourExternalId, deps.lang).catch(() => null) : null;
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
      manageUrl: `${deps.siteUrl.replace(/\/+$/, "")}/reserva/${record.manageToken}`,
    });
    await deps.send({ to: record.email, ...email });
    return "sent";
  } catch (error) {
    console.error(`[correo] no se envió la confirmación de ${record.refNumber}:`, (error as Error).message);
    return "failed";
  }
}
