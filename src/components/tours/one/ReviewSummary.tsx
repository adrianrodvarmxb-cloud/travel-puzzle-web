'use client';

import { useLanguage } from '@/lib/language-context';
import { formatRating } from '@/home/lib/format';
import { TravelerFavoriteBadge } from '@/components/tours/TravelerFavoriteBadge';

/** Resumen junto al título: ★ 4.8 · 12,703 reseñas (lleva a la sección de reseñas) y la etiqueta si aplica. */
export function ReviewSummary({ rating, reviews, dark = false }: { rating: number | null; reviews: number; dark?: boolean }) {
  const { t } = useLanguage();
  const value = formatRating(rating);
  if (!value || reviews <= 0) return null;
  const stars = Math.round(Number(rating));
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href="#resenas" className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold backdrop-blur ${dark ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-[#F4F7FD] text-[#0A1330]'}`}>
        <span className="tracking-tight text-[#F5B301]" aria-hidden>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span>
        <span>{value}</span>
        <span className="font-normal opacity-80">· {t('reviews.count', '{count} reviews').replace('{count}', reviews.toLocaleString())}</span>
      </a>
      <TravelerFavoriteBadge rating={rating} reviews={reviews} />
    </div>
  );
}
