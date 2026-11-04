'use client';

import React from 'react';
import Link from 'next/link';
import { Tour } from '@/types';
import { useLanguage } from '@/lib/language-context';
import { formatRating } from '@/home/lib/format';
import { TravelerFavoriteBadge } from './TravelerFavoriteBadge';

interface TourCardProps {
  tour: Tour;
  /** Frase de una reseña real de 5 ★ en el idioma del visitante (opcional). */
  highlight?: string | null;
}

/** Tarjeta de tour con el diseño tecnológico (fondo azul marino). */
export const TourCard: React.FC<TourCardProps> = ({ tour, highlight }) => {
  const { t } = useLanguage();
  const imageUrl = tour.images.find((img) => img && img.trim() !== '');
  const rating = formatRating(tour.rating);
  const free = t('tours.free', 'Free');

  return (
    <Link href={`/tours/${tour.id}`} className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121D45] text-white transition-transform duration-300 hover:-translate-y-1 hover:border-[#008DFF]/60">
      <div className="relative aspect-[16/10] bg-[#1B2A5E]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={tour.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-4xl opacity-50" aria-hidden>🌍</span>
        )}
        <TravelerFavoriteBadge rating={tour.rating} reviews={tour.reviewsNumber} className="absolute left-3 top-3" />
        {tour.price === 0 && (
          <span className="font-data absolute bottom-3 left-3 rounded-md border border-[#7CC4FF] bg-[#0A1330]/85 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-[#7CC4FF]">{free}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[#A9B6D6]">{tour.destination} · {tour.duration}</p>
        <h3 className="font-display line-clamp-2 text-lg font-semibold leading-snug">{tour.title}</h3>
        {highlight ? (
          <p className="line-clamp-2 text-sm italic leading-relaxed text-[#C9D6F5]">“{highlight}”</p>
        ) : (
          tour.brief && <p className="line-clamp-2 text-sm leading-relaxed text-[#A9B6D6]">{tour.brief}</p>
        )}
        <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-3.5 text-sm">
          <span>
            {rating ? (
              <><span className="text-[#F5B301]">★</span> <b>{rating}</b> <span className="text-[#A9B6D6]">· {tour.reviewsNumber.toLocaleString('es-MX')}</span></>
            ) : (
              <span className="text-[#7C8DBA]">—</span>
            )}
          </span>
          <span className="font-semibold text-[#EAF54F]">{tour.price > 0 ? `${tour.currency} ${tour.price}` : free}</span>
        </div>
      </div>
    </Link>
  );
};
