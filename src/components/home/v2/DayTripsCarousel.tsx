'use client';

import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import { tripCopy } from '@/trips/lib/copy';
import type { HomeDayTrip } from '@/home/load';
import { SectionHeading } from './SectionHeading';
import { type PriceLabels } from './FeaturedTours';
import { CardRail } from '@/components/tours/CardRail';
import { ExperienceCard } from '@/components/tours/ExperienceCard';
import { fromHomeTour, fromTripCard } from '@/tours/lib/card-sources';

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
      {/* REQ-520, REQ-527: la misma tarjeta para tours y viajes de agencias, en carrusel con flechas. */}
      <CardRail label={c.dayHeadline}>
        {items.map((d) =>
          d.type === 'tour'
            ? <ExperienceCard key={`t-${d.tour.id}`} card={fromHomeTour(d.tour, { lang: language, priceLabel: priceLabels[d.tour.id] })} />
            : <ExperienceCard key={`v-${d.trip.id}`} card={fromTripCard(d.trip, language, tc.from)} />,
        )}
      </CardRail>
    </section>
  );
}
