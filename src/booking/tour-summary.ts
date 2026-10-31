import type { PrismaClient } from "@prisma/client";
import type { EmailLang } from "@/notifications/lib/booking-email";
import type { MoreTour, TourSummary } from "./notify";

/** Título, proveedor, duración y punto de encuentro del tour (de nuestro catálogo en D1). */
export async function getTourSummary(prisma: PrismaClient, tourExternalId: number, lang: EmailLang): Promise<TourSummary | null> {
  const tour = await prisma.tour.findUnique({
    where: { externalId: tourExternalId },
    select: {
      providerTitle: true, duration: true, meetingPoint: true, titleImageURL: true, images: true, priceValue: true,
      id: true, rating: true, reviewsNumber: true, city: { select: { translations: true } },
      translations: { select: { language: true, title: true } },
    },
  });
  if (!tour) return null;
  const title = tour.translations.find((t) => t.language === lang)?.title ?? tour.translations.find((t) => t.language === "en")?.title ?? tour.translations[0]?.title;
  if (!title) return null;
  const imgs = (Array.isArray(tour.images) ? (tour.images as { URL?: string }[]) : []).map((i) => i?.URL).filter((u): u is string => typeof u === "string" && u.startsWith("https://"));
  const hero = tour.titleImageURL?.startsWith("https://") ? tour.titleImageURL : imgs[0] ?? null;
  return {
    title,
    provider: tour.providerTitle,
    duration: tour.duration,
    meetingPoint: tour.meetingPoint,
    imageUrl: hero,
    galleryUrls: imgs.filter((u) => u !== hero).slice(0, 2),
    isFree: Number(tour.priceValue) === 0,
    rating: tour.rating && tour.reviewsNumber > 0 ? { value: Number(tour.rating), count: tour.reviewsNumber } : null,
    cityName: cityName(tour.city?.translations, lang),
    pageId: tour.id,
  };
}

/** Nombre de la ciudad en el idioma pedido (las traducciones vienen como JSON { es, en, … }). */
export function cityName(translations: unknown, lang: EmailLang): string | null {
  const o = (translations ?? {}) as Record<string, unknown>;
  const v = o[lang] ?? o.en;
  return typeof v === "string" && v.trim() ? v : null;
}

/** Hasta 3 tours activos más en la misma ciudad, los más reseñados primero. */
export async function getMoreTours(prisma: PrismaClient, tourExternalId: number, lang: EmailLang, siteUrl: string): Promise<MoreTour[]> {
  const tour = await prisma.tour.findUnique({ where: { externalId: tourExternalId }, select: { cityId: true } });
  if (!tour) return [];
  const others = await prisma.tour.findMany({
    where: { cityId: tour.cityId, isActive: true, externalId: { not: tourExternalId }, titleImageURL: { startsWith: "https://" } },
    orderBy: [{ reviewsNumber: "desc" }],
    take: 3,
    select: { id: true, titleImageURL: true, rating: true, priceValue: true, translations: { select: { language: true, title: true } } },
  });
  const site = siteUrl.replace(/\/+$/, "");
  return others.flatMap((o) => {
    const title = o.translations.find((t) => t.language === lang)?.title ?? o.translations.find((t) => t.language === "en")?.title;
    if (!title || !o.titleImageURL) return [];
    return [{ title, url: `${site}/tours/${o.id}`, imageUrl: o.titleImageURL, rating: o.rating ? Number(o.rating) : null, isFree: Number(o.priceValue) === 0 }];
  });
}

/** Canales de contacto desde la configuración (cada uno es opcional). */
export function contactFromEnv(env: Record<string, string | undefined>) {
  const socials = (
    [
      ["Instagram", env.SOCIAL_INSTAGRAM],
      ["Facebook", env.SOCIAL_FACEBOOK],
      ["TikTok", env.SOCIAL_TIKTOK],
      ["YouTube", env.SOCIAL_YOUTUBE],
    ] as const
  )
    .filter(([, url]) => !!url)
    .map(([name, url]) => ({ name, url: url as string }));
  return { whatsapp: env.WHATSAPP_NUMBER || undefined, socials, assistantUrl: env.ASSISTANT_URL || undefined };
}
