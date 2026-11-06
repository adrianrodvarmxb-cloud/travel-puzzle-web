'use client';
import { useLanguage } from '@/lib/language-context';
import { tripCopy } from '@/trips/lib/copy';
import type { TripCard } from '@/trips/public-load';
import { OwnTripCard } from '@/components/trips/OwnTripCard';
import { SectionHeading } from './SectionHeading';
import { MobileRail } from './MobileRail';
import { homeCarouselTrips } from '@/home/lib/carousel';

/** Carrusel "Viajes by Travel Puzzle" del home (gate C). Sin viajes publicados no se muestra. */
export function OwnTripsCarousel({ trips }: { trips: TripCard[] }) {
    const { language } = useLanguage();
    const c = tripCopy(language);
    const shown = homeCarouselTrips(trips); // REQ-153: sin transporte
    if (!shown.length) return null;
    return (
        <section id="viajes" className="mx-auto max-w-[1280px] scroll-mt-24 px-4 pt-24 md:px-8 md:pt-28">
            <SectionHeading eyebrow={c.carouselEyebrow} title={c.carouselTitle} />
            <MobileRail gridClass="sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                {shown.map((t) => <OwnTripCard key={t.id} trip={t} c={c} lang={language} />)}
            </MobileRail>
        </section>
    );
}
