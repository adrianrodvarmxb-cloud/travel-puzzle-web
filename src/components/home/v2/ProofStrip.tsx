'use client';

import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import { formatRating } from '@/home/lib/format';
import type { HomeStats } from '@/home/load';

/** Cifras ya formateadas en el servidor con idioma fijo (REQ-173, INC-001). */
export interface ProofCounts { tours: string; cities: string; countries: string }

/** Franja de cifras en vivo, todas calculadas del catálogo. */
export function ProofStrip({ stats, counts }: { stats: HomeStats; counts: ProofCounts }) {
  const { language } = useLanguage();
  const c = homeCopy(language);
  const rating = formatRating(stats.rating);
  const items = [
    stats.tours > 0 && { value: counts.tours, label: c.statTours, accent: false },
    stats.cities > 0 && { value: counts.cities, label: c.statCities, accent: false },
    stats.countries > 0 && { value: counts.countries, label: c.statCountries, accent: false },
    rating && { value: `${rating} ★`, label: c.statRatingShort, accent: true },
  ].filter(Boolean) as { value: string; label: string; accent: boolean }[];
  if (!items.length) return null;

  return (
    <section aria-label={c.statTours} className="border-y border-white/10">
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-px bg-white/10 md:grid-cols-4">
        {items.map((m) => (
          <div key={m.label} className="bg-[#0A1330] px-4 py-6 md:px-8 md:py-7">
            <p className={`font-display text-3xl font-semibold md:text-[40px] ${m.accent ? 'text-[#EAF54F]' : 'text-white'}`}>{m.value}</p>
            <p className="font-data mt-1 text-[10px] uppercase tracking-[0.2em] text-[#A9B6D6] md:text-[11px]">{m.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
