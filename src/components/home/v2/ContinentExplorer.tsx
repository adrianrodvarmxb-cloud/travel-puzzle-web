'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import { nameIn } from '@/home/lib/destinations';
import { formatCount } from '@/home/lib/format';
import type { HomeData } from '@/home/load';
import { SectionHeading } from './SectionHeading';
import { ImageRotator } from './ImageRotator';
import { MobileRail } from './MobileRail';

export function ContinentExplorer({ continents }: { continents: HomeData['continents'] }) {
  const { language } = useLanguage();
  const c = homeCopy(language);
  if (!continents.length) return null;

  return (
    <section id="continentes" className="mx-auto max-w-[1280px] px-4 pt-24 md:px-8 md:pt-28">
      <SectionHeading eyebrow={c.contEyebrow} title={c.contTitle} subtitle={c.contSub} />
      <MobileRail gridClass="sm:grid-cols-2 lg:grid-cols-3">
        {continents.map((k) => (
          <div key={k.continent} className="overflow-hidden rounded-2xl border border-white/10 bg-[#121D45]">
            {k.images.length > 0 && <ImageRotator images={k.images} alt={c.continents[k.continent]} className="aspect-[16/9]" />}
            <div className="p-6">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-xl font-semibold text-white">{c.continents[k.continent]}</h3>
                <span className="font-data text-[11px] uppercase tracking-widest text-[#7CC4FF]">{c.tours(formatCount(k.tours, language))}</span>
              </div>
              <p className="mt-1 text-sm text-[#A9B6D6]">{c.countriesN(formatCount(k.countries, language))}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {k.top.map((t) => (
                  <Link key={t.countryId} href={`/tours?countryId=${t.countryId}`} className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-[#DCE4F5] hover:border-[#008DFF] hover:text-white">
                    {nameIn(k.names[t.countryId], language) || t.code} <span className="text-[#7C8DBA]">· {formatCount(t.tours, language)}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </MobileRail>
    </section>
  );
}
