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
import { OwnTripsCarousel } from "@/components/home/v2/OwnTripsCarousel";
import { loadFx, loadTripCards } from "@/trips/public-load";
import { priceLabelsFor } from "@/tours/lib/price-label";
import { isPrimeraPiezaEnabled } from "@/tours/lib/menu";
import { contactFromEnv } from "@/booking/tour-summary";
import { getPrisma } from "@/lib/prisma";
import { isHelpVisible } from "@/help/lib/faq";
import { getPreferredLanguage } from "@/lib/utils/cookies";

// Lee catálogo y reseñas reales en cada visita.
export const dynamic = "force-dynamic";

export default async function Home() {
  const env = process.env as Record<string, string | undefined>;
  const prisma = getPrisma();
  const lang = await getPreferredLanguage();
  // REQ-219: ningún carrusel del inicio muestra títulos con «FreeTour» / «Free Tour».
  const ownTrips = (await loadTripCards(lang)).filter((t) => !mentionsProviderBrand(t.title));
  const includePaid = env.PAID_TOURS_ENABLED === "true";
  // REQ-032 (INC-003): el home ya no consulta D1 en cada visita; caché compartida 5 min.
  const data = await cached(cacheKey("home", { lang, includePaid }), POLICY.home, () =>
    withRetry(() => loadHomeData({ prisma, highlights: createHighlightRepo(prisma), includePaid, lang })),
  );
  // REQ-170: EUR + «aprox. MXN» en las destacadas de pago (servidor, idioma fijo; INC-001), solo con PRIMERA_PIEZA_ENABLED.
  const paid = isPrimeraPiezaEnabled(env.PRIMERA_PIEZA_ENABLED) ? data.featured.filter((t) => !t.isFree && t.price > 0) : [];
  const rates = paid.length ? await loadFx().catch(() => null) : null;
  const priceLabels = priceLabelsFor(paid.map((t) => ({ id: t.id, price: t.price, currency: t.currency })), rates, lang === "es" ? "es" : "en");
  const contact = contactFromEnv(env);
  const footer = { whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials };

  return (
    <div className="min-h-screen bg-background">
      {/* Header y footer se conservan como están (decisión del PO) */}
      <Navbar />
      <main className="tp-dark">
        <HeroSearch slides={data.hero} quickCities={data.destinations.slice(0, 5)} />
        <ProofStrip stats={data.stats} />
        <PopularDestinations destinations={data.destinations} totalCities={data.stats.cities} />
        <FeaturedTours tours={data.featured} priceLabels={priceLabels} />
        <SectionBoundary name="carrusel-viajes"><OwnTripsCarousel trips={ownTrips} /></SectionBoundary>
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
