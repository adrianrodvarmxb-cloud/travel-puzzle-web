import { Navbar, Footer } from "@/components/layout";
import {
  SearchBooking,
  WhyChooseTravelPuzzle,
  RecentReviews,
  TopDestinations,
  RewardsBanner
} from "@/components/home";
import { QuickSignUp } from "@/components/auth";
import { loadHomeReviews } from "@/reviews/load";
import { getPreferredLanguage } from "@/lib/utils/cookies";

// Lee reseñas reales de la base en cada visita.
export const dynamic = "force-dynamic";

export default async function Home() {
  const reviews = await loadHomeReviews(await getPreferredLanguage());

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar Component */}
      <Navbar />

      {/* Quick Sign-Up Component */}
      <QuickSignUp />

      {/* Home Page Sections */}
      <SearchBooking />
      <WhyChooseTravelPuzzle />
      <RewardsBanner />
      <TopDestinations />
      <RecentReviews reviews={reviews} />
      {/* Footer */}
      <Footer />
    </div>
  );
}
