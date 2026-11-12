'use client';

import Link from '@/components/i18n/LocalizedLink';
import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import { nameIn, type DestinationCard } from '@/home/lib/destinations';
import { SectionHeading } from './SectionHeading';

/** Destinos en mosaico: el primero grande y cuatro más; con su país (REQ-3315: sin conteo). */
export function PopularDestinations({ destinations, totalCities }: { destinations: DestinationCard[]; totalCities: number }) {
  const { language } = useLanguage();
  const c = homeCopy(language);
  const list = destinations.slice(0, 5);
  if (!list.length) return null;

  return (
    <section id="destinos" className="mx-auto max-w-[1280px] scroll-mt-24 px-4 pt-20 md:px-8 md:pt-24">
      <SectionHeading
        eyebrow="01 — DESTINOS"
        title={c.destHeadline}
        action={totalCities > 0 ? <Link href="/tours" className="font-semibold text-[#7CC4FF] hover:text-white">{c.destAllPlain /* REQ-3315 */}</Link> : undefined}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-[260px_260px] md:gap-4">
        {list.map((d, k) => {
          const city = nameIn(d.names, language);
          const big = k === 0;
          return (
            <Link
              key={d.cityId}
              href={`/tours?countryId=${d.countryId}&cityId=${d.cityId}`}
              className={`group relative block overflow-hidden rounded-2xl bg-[#121D45] transition-transform duration-300 hover:-translate-y-1 ${big ? 'col-span-2 aspect-[4/3] md:row-span-2 md:aspect-auto' : 'aspect-square md:aspect-auto'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.image} alt={city} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(10,19,48,0.9))]" />
              <div className="absolute inset-x-4 bottom-4 md:inset-x-5">
                {big && <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[#EAF54F]">{nameIn(d.countryNames, language)}</p>}
                <p className={`font-display font-bold text-white ${big ? 'text-3xl md:text-[40px]' : 'text-xl md:text-2xl'}`}>{city}</p>
                {!big && <p className="font-data mt-1 text-[11px] uppercase tracking-widest text-[#DCE4F5]">{nameIn(d.countryNames, language) /* REQ-3315: país en lugar del conteo */}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
