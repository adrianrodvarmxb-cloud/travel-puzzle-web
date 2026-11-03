'use client';

import { useLanguage } from '@/lib/language-context';
import { isTravelerFavorite } from '@/reviews/lib/highlights';

/** Etiqueta "Favorito de los viajeros": solo aparece si el tour la gana con sus datos reales. */
export function TravelerFavoriteBadge({ rating, reviews, className = '' }: { rating: number | string | null | undefined; reviews: number; className?: string }) {
  const { t } = useLanguage();
  if (!isTravelerFavorite(rating, reviews)) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md bg-[#EAF54F] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#0A1330] shadow-sm ${className}`}>
      <span aria-hidden>★</span> {t('tours.favorite', 'Traveler favorite')}
    </span>
  );
}
