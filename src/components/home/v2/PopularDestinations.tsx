'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import { nameIn, type DestinationCard } from '@/home/lib/destinations';
import { formatCount } from '@/home/lib/format';
import { SectionHeading } from './SectionHeading';

export function PopularDestinations({ destinations }: { destinations: DestinationCard[] }) {
  const { language } = useLanguage();
  const c = homeCopy(language);
  if (!destinations.length) return null;

  return (
    <section id="destinos" className="bg-white px-4 py-16">
      <div className="container mx-auto max-w-6xl">
        <SectionHeading eyebrow="01 — Destinos" title={c.destTitle} subtitle={c.destSub} />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {destinations.map((d) => {
            const city = nameIn(d.names, language);
            return (
              <Link
                key={d.cityId}
                href={`/tours?countryId=${d.countryId}&cityId=${d.cityId}`}
                className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-[#0A1330] shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.image} alt={city} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1330]/85 via-[#0A1330]/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <p className="text-lg font-bold leading-tight">{city}</p>
                  <p className="text-xs text-white/80">{nameIn(d.countryNames, language)}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-[#EAF54F]">{c.tours(formatCount(d.tours, language))}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
