'use client';

import Link from '@/components/i18n/LocalizedLink';
import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import { nameIn } from '@/home/lib/destinations';
import { formatCount, formatRating } from '@/home/lib/format';
import type { CityCard as CityCardData } from '@/map/load';

/** Tarjeta flotante de una ciudad del mapa: total de tours y 3 recomendados (regla 60/40). */
export function CityCard({ card, loading, onClose }: { card: CityCardData | null; loading: boolean; onClose: () => void }) {
  const { language } = useLanguage();
  const c = homeCopy(language);
  const city = card ? nameIn(card.names, language) : '';

  return (
    <div role="dialog" aria-label={city || c.mapLoading} className="absolute inset-x-3 bottom-3 z-10 rounded-2xl border border-white/15 bg-[#0A1330]/95 p-4 text-white shadow-2xl backdrop-blur md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:w-[340px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[#EAF54F]">{card ? c.tours(formatCount(card.tours, language)) : '…'}</p>
          <p className="font-display mt-1 text-2xl font-semibold">{loading ? c.mapLoading : city}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={c.close} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 hover:bg-white/10">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      {card && (
        <>
          <ul className="mt-3 space-y-2">
            {card.top.map((t) => {
              const title = nameIn(t.titles, language);
              const rating = formatRating(t.rating);
              return (
                <li key={t.id}>
                  <Link href={`/tours/${t.id}`} className="flex gap-3 rounded-xl p-2 hover:bg-white/5">
                    {t.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.image} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="h-14 w-14 shrink-0 rounded-lg bg-[#1B2A5E]" />
                    )}
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm font-semibold">{title}</span>
                      <span className="mt-0.5 block text-xs text-[#A9B6D6]">
                        {rating && <><span className="text-[#F5B301]">★</span> {rating} · </>}
                        {t.isFree ? c.free : `${t.currency} ${t.price}`}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link href={`/tours?countryId=${card.countryId}&cityId=${card.cityId}`} className="mt-3 block rounded-xl bg-[#C12909] px-4 py-3 text-center text-sm font-semibold text-white hover:opacity-90">
            {c.seeToursIn(city)}
          </Link>
        </>
      )}
    </div>
  );
}
