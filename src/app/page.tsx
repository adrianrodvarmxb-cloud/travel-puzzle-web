import { Navbar, Footer } from "@/components/layout";
import {
  SearchBooking,
  WhyChooseTravelPuzzle,
  RecentReviews,
  TopDestinations,
  RewardsBanner
} from "@/components/home";
import { QuickSignUp } from "@/components/auth";

export default function Home() {
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
      {/* Footer */}
      <Footer />
    </div>
  );
}
