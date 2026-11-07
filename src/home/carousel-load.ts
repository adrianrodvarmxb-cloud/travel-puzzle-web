/**
 * REQ-851: páginas siguientes de los carruseles del inicio (/api/home/carrusel). Raíz del dominio: hace I/O y lee las
 * banderas; el orden y la paginación son de la lib pura (lib/carousel-pages.ts) y el modelo de tarjeta de
 * src/tours/lib/card-sources.ts, armado aquí con idioma fijo (INC-001: el navegador solo pinta).
 * Caché compartida: el orden completo y cada página (misma política que el inicio).
 */
import { cached, cacheKey, POLICY } from "@/cache/edge";
import { getPrisma } from "@/lib/prisma";
import { withRetry } from "@/tours/lib/d1-load";
import { taxonomyPublishEnabled } from "@/taxonomy/lib/publish";
import { isHomeCarouselsEnabled } from "./lib/flags";
import { carouselPage, type HomeCarouselId } from "./lib/carousel-pages";
import { mentionsProviderBrand } from "./lib/brand";
import { homeTaxonomy, hydrateCarouselItems, loadCarouselOrder } from "./load";
import { loadFx, loadTripCards } from "@/trips/public-load";
import { priceLabelsFor } from "@/tours/lib/price-label";
import { isPrimeraPiezaEnabled } from "@/tours/lib/menu";
import { fromHomeTour, fromTripCard, withFinalHref } from "@/tours/lib/card-sources";
import { getDestinations } from "@/destinations/server";
import { canonicalHrefs } from "@/seo/lib/itemlist";
import { tripCopy } from "@/trips/lib/copy";
import type { ExperienceCardModel } from "@/tours/lib/experience-card";

export interface CarouselPageResponse { cards: ExperienceCardModel[]; hasMore: boolean }

// REQ-851
export async function loadCarouselPageCards({ c, p, lang }: { c: HomeCarouselId; p: number; lang: string }): Promise<CarouselPageResponse> {
  const env = process.env as Record<string, string | undefined>;
  if (!isHomeCarouselsEnabled(env.CARRUSELES_HOME_ENABLED)) return { cards: [], hasMore: false };
  const includePaid = env.PAID_TOURS_ENABLED === "true";
  const tax = taxonomyPublishEnabled(env);
  return cached(cacheKey("homeCarouselPage", { c, p, lang, includePaid, tax, v: 2 /* REQ-668 href final */ }), POLICY.home, async () => {
    const prisma = getPrisma();
    const ownTrips = (await loadTripCards(lang)).filter((t) => !mentionsProviderBrand(t.title)); // REQ-219
    const order = await cached(cacheKey("homeCarouselOrder", { lang, includePaid, tax, v: 1 }), POLICY.home, () =>
      withRetry(() => loadCarouselOrder(prisma, includePaid, ownTrips, homeTaxonomy(tax))));
    const page = carouselPage(order[c], p);
    const items = await withRetry(() => hydrateCarouselItems(prisma, page.items, ownTrips));
    const tours = items.flatMap((x) => (x.type === "tour" ? [x.tour] : []));
    const paid = isPrimeraPiezaEnabled(env.PRIMERA_PIEZA_ENABLED) ? tours.filter((t) => !t.isFree && t.price > 0) : [];
    const rates = paid.length ? await loadFx().catch(() => null) : null;
    const labels = priceLabelsFor(paid.map((t) => ({ id: t.id, price: t.price, currency: t.currency })), rates, lang === "es" ? "es" : "en");
    const from = tripCopy(lang).from;
    // REQ-668: las páginas siguientes también enlazan la ficha final (sin el 301 de /tours/{id}).
    const fin = withFinalHref(isPrimeraPiezaEnabled(env.PRIMERA_PIEZA_ENABLED) ? canonicalHrefs(await getDestinations().catch(() => null)) : undefined);
    const cards = items.map((x) => (x.type === "tour" ? fromHomeTour(fin(x.tour), { lang, priceLabel: labels[x.tour.id] }) : fromTripCard(x.trip, lang, from)));
    return { cards, hasMore: page.hasMore };
  });
}
