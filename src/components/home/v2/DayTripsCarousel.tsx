'use client';

import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import { tripCopy } from '@/trips/lib/copy';
import type { HomeDayTrip } from '@/home/load';
import { OwnTripCard } from '@/components/trips/OwnTripCard';
import { SectionHeading } from './SectionHeading';
import { MobileRail } from './MobileRail';
import { HomeTourCard, type PriceLabels } from './FeaturedTours';

/**
 * REQ-453: «Excursiones de un día» de cualquier proveedor, ordenadas por el medidor de reseñas (REQ-450).
 * Sin inventario (o con CARRUSELES_HOME_ENABLED apagada) no se muestra.
 */
export function DayTripsCarousel({ items, priceLabels = {} }: { items: HomeDayTrip[]; priceLabels?: PriceLabels }) {
  const { language } = useLanguage();
  if (!items.length) return null;
  const c = homeCopy(language);
  const tc = tripCopy(language);
  return (
    <section id="excursiones" className="mx-auto max-w-[1280px] scroll-mt-24 px-4 pt-24 md:px-8 md:pt-28">
      <SectionHeading eyebrow={c.dayEyebrow} title={c.dayHeadline} subtitle={c.daySub} />
      <MobileRail gridClass="sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {items.map((d) =>
          d.type === 'tour'
            ? <HomeTourCard key={`t-${d.tour.id}`} t={d.tour} language={language} c={c} priceLabel={priceLabels[d.tour.id]} />
            : <OwnTripCard key={`v-${d.trip.id}`} trip={d.trip} c={tc} lang={language} />,
        )}
      </MobileRail>
    </section>
  );
}
