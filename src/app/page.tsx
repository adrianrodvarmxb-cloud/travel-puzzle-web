import { Navbar } from "@/components/layout";
import { RecentReviews } from "@/components/home";
import {
  HeroSearch,
  PopularDestinations,
  FeaturedTours,
  WhyTravelPuzzle,
  ContinentExplorer,
  ExpertCta,
  SiteFooter,
  WhatsAppBubble,
} from "@/components/home/v2";
import { loadHomeReviews } from "@/reviews/load";
import { loadHomeData } from "@/home/load";
import { contactFromEnv } from "@/booking/tour-summary";
import { getPreferredLanguage } from "@/lib/utils/cookies";

// Lee catálogo y reseñas reales en cada visita.
export const dynamic = "force-dynamic";

export default async function Home() {
  const env = process.env as Record<string, string | undefined>;
  const [reviews, data] = await Promise.all([
    loadHomeReviews(await getPreferredLanguage()),
    loadHomeData({ includePaid: env.PAID_TOURS_ENABLED === "true" }),
  ]);
  const contact = contactFromEnv(env);
  const footer = { whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSearch stats={data.stats} />
      <PopularDestinations destinations={data.destinations} />
      <FeaturedTours tours={data.featured} />
      <WhyTravelPuzzle stats={data.stats} />
      <ContinentExplorer continents={data.continents} />
      <ExpertCta whatsapp={contact.whatsapp} />
      <RecentReviews reviews={reviews} />
      <SiteFooter contact={footer} />
      <WhatsAppBubble whatsapp={contact.whatsapp} />
    </div>
  );
}
