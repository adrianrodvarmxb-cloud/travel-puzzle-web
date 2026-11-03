'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import { nameIn } from '@/home/lib/destinations';
import { formatCount } from '@/home/lib/format';
import type { HomeData } from '@/home/load';
import { SectionHeading } from './SectionHeading';
import { ImageRotator } from './ImageRotator';

export function ContinentExplorer({ continents }: { continents: HomeData['continents'] }) {
  const { language } = useLanguage();
  const c = homeCopy(language);
  if (!continents.length) return null;

  return (
    <section id="continentes" className="bg-white px-4 py-16">
      <div className="container mx-auto max-w-6xl">
        <SectionHeading eyebrow="04 — El mundo" title={c.contTitle} subtitle={c.contSub} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {continents.map((k) => (
            <div key={k.continent} className="overflow-hidden rounded-2xl border border-[#E6EBF5]">
              {k.images.length > 0 && <ImageRotator images={k.images} alt={c.continents[k.continent]} className="aspect-[16/9]" />}
              <div className="p-6">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-lg font-bold text-[#0A1330]">{c.continents[k.continent]}</h3>
                <span className="font-mono text-[11px] uppercase tracking-widest text-[#008DFF]">{c.tours(formatCount(k.tours, language))}</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{c.countriesN(formatCount(k.countries, language))}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {k.top.map((t) => (
                  <Link key={t.countryId} href={`/tours?countryId=${t.countryId}`} className="rounded-full border border-[#E6EBF5] px-3 py-1.5 text-sm text-[#0A1330] hover:border-[#008DFF] hover:text-[#008DFF]">
                    {nameIn(k.names[t.countryId], language) || t.code} <span className="text-gray-400">· {formatCount(t.tours, language)}</span>
                  </Link>
                ))}
              </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
