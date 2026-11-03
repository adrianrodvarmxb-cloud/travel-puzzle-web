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
import { createHighlightRepo } from "@/reviews/repository";
import { contactFromEnv } from "@/booking/tour-summary";
import { getPrisma } from "@/lib/prisma";
import { getPreferredLanguage } from "@/lib/utils/cookies";

// Lee catálogo y reseñas reales en cada visita.
export const dynamic = "force-dynamic";

export default async function Home() {
  const env = process.env as Record<string, string | undefined>;
  const prisma = getPrisma();
  const data = await loadHomeData({
    prisma,
    highlights: createHighlightRepo(prisma),
    includePaid: env.PAID_TOURS_ENABLED === "true",
    lang: await getPreferredLanguage(),
  });
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
        <HowItWorks bookingsEnabled={env.BOOKINGS_ENABLED === "true"} />
        <ContinentExplorer continents={data.continents} />
        <MapSection />
        <HomeReviews reviews={data.reviews} average={data.stats.rating} />
        <ExpertCta whatsapp={contact.whatsapp} />
      </main>
      <SiteFooter contact={footer} />
      <WhatsAppBubble whatsapp={contact.whatsapp} />
    </div>
  );
}
