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
import { OwnTripsCarousel } from "@/components/home/v2/OwnTripsCarousel";
import { loadTripCards } from "@/trips/public-load";
import { contactFromEnv } from "@/booking/tour-summary";
import { getPrisma } from "@/lib/prisma";
import { isHelpVisible } from "@/help/lib/faq";
import { getPreferredLanguage } from "@/lib/utils/cookies";
import { formatCount } from "@/home/lib/format";
import { withToursText } from "@/home/lib/hero";

// Lee catálogo y reseñas reales en cada visita.
export const dynamic = "force-dynamic";

export default async function Home() {
  const env = process.env as Record<string, string | undefined>;
  const prisma = getPrisma();
  const lang = await getPreferredLanguage();
  const ownTrips = await loadTripCards(lang);
  const includePaid = env.PAID_TOURS_ENABLED === "true";
  // REQ-032 (INC-003): el home ya no consulta D1 en cada visita; caché compartida 5 min.
  const data = await cached(cacheKey("home", { lang, includePaid }), POLICY.home, () =>
    withRetry(() => loadHomeData({ prisma, highlights: createHighlightRepo(prisma), includePaid, lang })),
  );
  // REQ-173 (INC-001): «8,054» se formatea aquí, en el servidor, con idioma fijo.
  const numLang = lang === "en" ? "en" : "es";
  const counts = { tours: formatCount(data.stats.tours, numLang), cities: formatCount(data.stats.cities, numLang), countries: formatCount(data.stats.countries, numLang) };
  const hero = withToursText(data.hero, numLang);
  const contact = contactFromEnv(env);
  const footer = { whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials };

  return (
    <div className="min-h-screen bg-background">
      {/* Header y footer se conservan como están (decisión del PO) */}
      <Navbar />
      <main className="tp-dark">
        <HeroSearch slides={hero} quickCities={data.destinations.slice(0, 5)} />
        <ProofStrip stats={data.stats} counts={counts} />
        <PopularDestinations destinations={data.destinations} totalCities={data.stats.cities} />
        <FeaturedTours tours={data.featured} />
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
