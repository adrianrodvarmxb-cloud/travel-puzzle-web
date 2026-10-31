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
  send(email: { to: string; subject: string; html: string; text: string }): Promise<string>;
}

/** Correo de confirmación de una reserva guardada. Nunca lanza: la reserva ya está hecha. */
export async function sendBookingConfirmation(record: BookingRecord, deps: Deps): Promise<"disabled" | "sent" | "failed"> {
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
    });
    await deps.send({ to: record.email, ...email });
    return "sent";
  } catch (error) {
    console.error(`[correo] no se envió la confirmación de ${record.refNumber}:`, (error as Error).message);
    return "failed";
  }
}
