import { paidInRecommendations } from '@/booking/lib/flags';
import { taxonomyPublishEnabled } from "@/taxonomy/lib/publish";
import { JsonLd as ListJsonLd } from "@/components/destinations/JsonLd";
import { homeItemLists } from "@/seo/lib/listing-ld";
import { canonicalHrefs } from "@/seo/lib/itemlist";
import { getDestinations, siteUrl as siteBase } from "@/destinations/server";
import { homeTaxonomy } from "@/home/load";
import { SectionBoundary } from '@/components/common/SectionBoundary';
import { Navbar } from "@/components/layout";
import {
  HeroSearch,
  ProofStrip,
  PopularDestinations,
  FeaturedTours,
  HowItWorks,
  ContinentExplorer,
  MapSection,
  HomeReviews,
  ExpertCta,
  SiteFooter,
  WhatsAppBubble,
} from "@/components/home/v2";
import { loadHomeData } from "@/home/load";
import { mentionsProviderBrand } from "@/home/lib/brand";
import { cached, cacheKey, POLICY } from "@/cache/edge";
import { withRetry } from "@/tours/lib/d1-load";
import { createHighlightRepo } from "@/reviews/repository";
import { HashScroll } from "@/components/home/v2/HashScroll";
import { DayTripsCarousel } from "@/components/home/v2/DayTripsCarousel";
import { isHomeCarouselsEnabled } from "@/home/lib/flags";
import { loadFx, loadTripCards } from "@/trips/public-load";
import { priceLabelsFor } from "@/tours/lib/price-label";
import { isPrimeraPiezaEnabled } from "@/tours/lib/menu";
import { contactFromEnv } from "@/booking/tour-summary";
import { getPrisma } from "@/lib/prisma";
import { isHelpVisible } from "@/help/lib/faq";
import { getRouteLanguage } from '@/i18n/server';
import { hubLocaleMetadata } from '@/i18n/metadata';
import { pageCopy } from '@/i18n/lib/copy';
import type { Metadata } from "next";
import { formatCount } from "@/home/lib/format";
import { withToursText } from "@/home/lib/hero";
import { JsonLd } from "@/components/destinations/JsonLd";
import { homeJsonLd } from "@/seo/lib/home-jsonld";
import { siteUrl } from "@/destinations/server";
import { withFinalHref } from "@/tours/lib/card-sources";
import { slimDayTrip, slimHomeTour } from "@/home/lib/slim";

// Lee catálogo y reseñas reales en cada visita.
export const dynamic = "force-dynamic";

// REQ-660…665 (Gate 3): con LOCALE_URLS_ENABLED, title, canonical y hreflang del idioma de la URL; sin ella, {} (los del layout, como hoy).
export async function generateMetadata(): Promise<Metadata> {
  const loc = await hubLocaleMetadata("/");
  if (!loc) return {};
  const c = pageCopy(loc.lang).home;
  return { title: { absolute: c.title }, description: c.description, ...loc.meta, openGraph: { title: c.title, description: c.description, ...loc.meta.openGraph } };
}

export default async function Home() {
  const env = process.env as Record<string, string | undefined>;
  const prisma = getPrisma();
  const lang = await getRouteLanguage();
  // REQ-219 (y REQ-454): ningún carrusel del inicio muestra títulos con «FreeTour» / «Free Tour».
  const ownTrips = (await loadTripCards(lang)).filter((t) => !mentionsProviderBrand(t.title));
  // REQ-014: tours de pago en recomendaciones solo con PAID_TOURS_ENABLED y PAID_TOURS_IN_RECOMMENDATIONS.
  const includePaid = paidInRecommendations(env);
  // REQ-450/453: medidor de reseñas y «Excursiones de un día» (CARRUSELES_HOME_ENABLED).
  const carousels = isHomeCarouselsEnabled(env.CARRUSELES_HOME_ENABLED);
  // REQ-032 (INC-003): el home ya no consulta D1 en cada visita; caché compartida 5 min.
  // T3 (REQ-406, REQ-407): destacados con la taxonomía solo con TAXONOMY_PUBLISH_ENABLED (apagada).
  const taxonomyOn = taxonomyPublishEnabled(env);
  const data = await cached(cacheKey("home", { lang, includePaid, carousels: String(carousels), tax: taxonomyOn, v: "carruseles-610" }) /* REQ-520 forma de HomeTour; REQ-532…537 formato recalculado */, POLICY.home, () =>
    withRetry(() => loadHomeData({ prisma, highlights: createHighlightRepo(prisma), includePaid, lang, carousels, ownTrips, taxonomy: homeTaxonomy(taxonomyOn) })),
  );
  // REQ-173 (INC-001): «8,054» se formatea aquí, en el servidor, con idioma fijo.
  const numLang = lang === "en" ? "en" : "es";
  const counts = { tours: formatCount(data.stats.tours, numLang), cities: formatCount(data.stats.cities, numLang), countries: formatCount(data.stats.countries, numLang) };
  const hero = withToursText(data.hero, numLang);
  // REQ-170: EUR + «aprox. MXN» en las destacadas de pago (servidor, idioma fijo; INC-001), solo con PRIMERA_PIEZA_ENABLED.
  // REQ-453: también los tours de pago de «Excursiones de un día».
  const homeTours = [...data.featured, ...data.dayTrips.flatMap((d) => (d.type === "tour" ? [d.tour] : []))];
  const paid = isPrimeraPiezaEnabled(env.PRIMERA_PIEZA_ENABLED) ? homeTours.filter((t) => !t.isFree && t.price > 0) : [];
  const rates = paid.length ? await loadFx().catch(() => null) : null;
  const priceLabels = priceLabelsFor(paid.map((t) => ({ id: t.id, price: t.price, currency: t.currency })), rates, lang === "es" ? "es" : "en");
  const contact = contactFromEnv(env);
  // REQ-582: ItemList de los carruseles con la URL canónica de cada tarjeta. Si el árbol falla, sin resolver (nunca tumba el inicio).
  const resolve = isPrimeraPiezaEnabled(env.PRIMERA_PIEZA_ENABLED) ? canonicalHrefs(await getDestinations().catch(() => null)) : undefined;
  const carouselLists = homeItemLists({ siteUrl: siteBase(), lang, featured: data.featured, dayTrips: data.dayTrips, resolve });
  // REQ-668 (Gate 3): las tarjetas enlazan la ficha final (LocalizedLink le pone el prefijo del idioma), sin el 301 de /tours/{id}.
  const fin = withFinalHref(resolve);
  const featured = data.featured.map(fin);
  const dayTrips = data.dayTrips.map((d) => (d.type === "tour" ? { ...d, tour: fin(d.tour) } : d));
  const footer = { whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials };

  return (
    <div className="min-h-screen bg-background">
      {/* REQ-575: WebSite (SearchAction) y Organization en el HTML servido. */}
      <JsonLd data={homeJsonLd(siteUrl(), contact.socials)} />
      {/* Header y footer se conservan como están (decisión del PO) */}
      <Navbar />
      <main className="tp-dark">
        <HeroSearch slides={hero} quickCities={data.destinations.slice(0, 5)} />
        <ProofStrip stats={data.stats} counts={counts} />
        <PopularDestinations destinations={data.destinations} totalCities={data.stats.cities} />
        <FeaturedTours tours={featured.map((t) => slimHomeTour(t, lang)) /* REQ-857; REQ-668 conserva href */} priceLabels={priceLabels} hasMore={data.carouselMore?.elegidos ?? false} />
        {/* REQ-452: el carrusel de viajes de proveedores con una afirmación falsa se borró (PO, 6 nov 2026). */}
        <SectionBoundary name="carrusel-excursiones"><DayTripsCarousel items={dayTrips.map((d) => slimDayTrip(d, lang)) /* REQ-857; REQ-668 */} priceLabels={priceLabels} hasMore={data.carouselMore?.excursiones ?? false} /></SectionBoundary>
        {carouselLists.length > 0 && <ListJsonLd data={carouselLists} />}
        <HowItWorks bookingsEnabled={env.BOOKINGS_ENABLED === "true"} />
        <ContinentExplorer continents={data.continents} />
        <MapSection />
        <HomeReviews reviews={data.reviews} average={data.stats.rating} />
        <ExpertCta whatsapp={contact.whatsapp} />
      </main>
      <SiteFooter contact={footer} helpEnabled={isHelpVisible(env.BOOKINGS_ENABLED)} />
      <WhatsAppBubble whatsapp={contact.whatsapp} />
      <HashScroll />
    </div>
  );
}
