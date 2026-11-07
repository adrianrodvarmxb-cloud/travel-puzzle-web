'use client';

import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import { tripCopy } from '@/trips/lib/copy';
import type { HomeDayTrip } from '@/home/load';
import { type PriceLabels } from './FeaturedTours';
import { HomeCarousel } from './HomeCarousel';
import { fromHomeTour, fromTripCard } from '@/tours/lib/card-sources';

/**
 * REQ-453: «Excursiones de un día» de cualquier proveedor, ordenadas por el medidor de reseñas (REQ-450).
 * Sin inventario (o con CARRUSELES_HOME_ENABLED apagada) no se muestra.
 */
export function DayTripsCarousel({ items, priceLabels = {}, hasMore = false }: { items: HomeDayTrip[]; priceLabels?: PriceLabels; hasMore?: boolean }) {
  const { language } = useLanguage();
  if (!items.length) return null;
  const c = homeCopy(language);
  const tc = tripCopy(language);
  // REQ-852…615: todas las excursiones por páginas, con la misma tarjeta para tours y viajes de agencias.
  return (
    <section id="excursiones" className="mx-auto max-w-[1280px] scroll-mt-24 px-4 pt-24 md:px-8 md:pt-28">
    <HomeCarousel id="excursiones" eyebrow={c.dayEyebrow} title={c.dayHeadline} subtitle={c.daySub} lang={language} seeAllLabel={c.seeAll}
      cards={items.map((d) => (d.type === 'tour' ? fromHomeTour(d.tour, { lang: language, priceLabel: priceLabels[d.tour.id] }) : fromTripCard(d.trip, language, tc.from)))} hasMore={hasMore} />
    </section>
  );
}
