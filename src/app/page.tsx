import { Navbar } from "@/components/layout";
import {
  HeroSearch,
  PopularDestinations,
  FeaturedTours,
  WhyTravelPuzzle,
  ContinentExplorer,
  ExpertCta,
  HomeReviews,
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
      <Navbar />
      <HeroSearch stats={data.stats} slides={data.hero} />
      <PopularDestinations destinations={data.destinations} />
      <FeaturedTours tours={data.featured} />
      <WhyTravelPuzzle stats={data.stats} />
      <ContinentExplorer continents={data.continents} />
      <ExpertCta whatsapp={contact.whatsapp} />
      <HomeReviews reviews={data.reviews} />
      <SiteFooter contact={footer} />
      <WhatsAppBubble whatsapp={contact.whatsapp} />
    </div>
  );
}
