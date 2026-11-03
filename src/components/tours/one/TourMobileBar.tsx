'use client';

import { useLanguage } from '@/lib/language-context';
import { formatRating } from '@/home/lib/format';
import { waLink } from '@/home/lib/copy';
import { advisorText, bookingCopy, priceText, type BookingMode } from '@/tours/lib/booking-cta';
import type { Tour } from '@/types';

/** Barra fija abajo en celular: precio, calificación y el botón para apartar (gate 3 de la auditoría de diseño). */
export function TourMobileBar({ tour, mode, whatsapp }: { tour: Tour; mode: BookingMode; whatsapp?: string }) {
  const { t, language } = useLanguage();
  const copy = bookingCopy(language);
  const rating = formatRating(tour.rating);
  const wa = waLink(whatsapp, advisorText(tour.title, language));
  const href = mode === 'advisor' ? wa : '#disponibilidad';
  if (!href) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0A1330]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display truncate text-lg font-bold leading-tight text-white">{priceText(tour.price, tour.currency, t('tours.free'))}</p>
          {rating && <p className="text-xs text-[#A9B6D6]"><span className="text-[#F5B301]">★</span> {rating} · {t('reviews.count', '{count} reviews').replace('{count}', tour.reviewsNumber.toLocaleString())}</p>}
        </div>
        <a
          href={href}
          {...(mode === 'advisor' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="shrink-0 rounded-xl bg-[#C12909] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#A32207]"
        >
          {copy.barCta(mode)}
        </a>
      </div>
    </div>
  );
}
