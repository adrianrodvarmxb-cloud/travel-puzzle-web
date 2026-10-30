import type { PrismaClient } from "@prisma/client";
import type { EmailLang } from "@/notifications/lib/booking-email";
import type { TourSummary } from "./notify";

/** Título, proveedor, duración y punto de encuentro del tour (de nuestro catálogo en D1). */
export async function getTourSummary(prisma: PrismaClient, tourExternalId: number, lang: EmailLang): Promise<TourSummary | null> {
  const tour = await prisma.tour.findUnique({
    where: { externalId: tourExternalId },
    select: { providerTitle: true, duration: true, meetingPoint: true, translations: { select: { language: true, title: true } } },
  });
  if (!tour) return null;
  const title = tour.translations.find((t) => t.language === lang)?.title ?? tour.translations.find((t) => t.language === "en")?.title ?? tour.translations[0]?.title;
  return title ? { title, provider: tour.providerTitle, duration: tour.duration, meetingPoint: tour.meetingPoint } : null;
}
