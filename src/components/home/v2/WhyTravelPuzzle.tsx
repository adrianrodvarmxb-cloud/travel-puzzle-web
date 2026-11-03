'use client';

import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import { formatCount, formatRating } from '@/home/lib/format';
import type { HomeStats } from '@/home/load';
import { SectionHeading } from './SectionHeading';

const ICONS = ['🧭', '★', '💬', '🎫'];

export function WhyTravelPuzzle({ stats }: { stats: HomeStats }) {
  const { language } = useLanguage();
  const c = homeCopy(language);
  const rating = formatRating(stats.rating);
  const metrics = [
    stats.tours > 0 && { value: formatCount(stats.tours, language), label: c.statTours },
    stats.cities > 0 && { value: formatCount(stats.cities, language), label: c.statCities },
    stats.countries > 0 && { value: formatCount(stats.countries, language), label: c.statCountries },
    rating && { value: `${rating} ★`, label: c.statRating(formatCount(stats.reviews, language)) },
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <section id="por-que" className="bg-[#F4F7FD] px-4 py-16">
      <div className="container mx-auto max-w-6xl">
        <SectionHeading eyebrow="03 — Travel Puzzle" title={c.whyTitle} subtitle={c.whySub} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.reasons.map(([title, text], i) => (
            <div key={title} className="rounded-2xl border border-[#E6EBF5] bg-white p-6">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A1330] text-xl text-[#EAF54F]" aria-hidden>{ICONS[i]}</div>
              <h3 className="text-lg font-bold text-[#0A1330]">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{text}</p>
            </div>
          ))}
        </div>
        {metrics.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[#E6EBF5] md:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label} className="bg-white p-6 text-center">
                <p className="text-3xl font-bold text-[#304A9F]">{m.value}</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-gray-500">{m.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
