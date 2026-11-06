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
import { cached, cacheKey, POLICY } from "@/cache/edge";
import { withRetry } from "@/tours/lib/d1-load";
import { createHighlightRepo } from "@/reviews/repository";
import { HashScroll } from "@/components/home/v2/HashScroll";
import { DayTripsCarousel } from "@/components/home/v2/DayTripsCarousel";
import { isHomeCarouselsEnabled } from "@/home/lib/flags";
import { loadTripCards } from "@/trips/public-load";
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
  const ownTrips = await loadTripCards(lang);
  const includePaid = env.PAID_TOURS_ENABLED === "true";
  // REQ-450/453: medidor de reseñas y «Excursiones de un día» (CARRUSELES_HOME_ENABLED).
  const carousels = isHomeCarouselsEnabled(env.CARRUSELES_HOME_ENABLED);
  // REQ-032 (INC-003): el home ya no consulta D1 en cada visita; caché compartida 5 min.
  const data = await cached(cacheKey("home", { lang, includePaid, carousels: String(carousels) }), POLICY.home, () =>
    withRetry(() => loadHomeData({ prisma, highlights: createHighlightRepo(prisma), includePaid, lang, carousels, ownTrips })),
  );
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
        <FeaturedTours tours={data.featured} />
        {/* REQ-452: el carrusel de viajes de proveedores con una afirmación falsa se borró (PO, 6 nov 2026). */}
        <SectionBoundary name="carrusel-excursiones"><DayTripsCarousel items={data.dayTrips} /></SectionBoundary>
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
