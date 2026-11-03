'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import { nameIn } from '@/home/lib/destinations';
import { formatCount, formatRating } from '@/home/lib/format';
import type { HomeTour } from '@/home/load';
import { TravelerFavoriteBadge } from '@/components/tours/TravelerFavoriteBadge';
import { SectionHeading } from './SectionHeading';
import { MobileRail } from './MobileRail';

/** Favoritos de los viajeros (regla 60/40 cuando hay tours de pago), con frase de reseña real. */
export function FeaturedTours({ tours }: { tours: HomeTour[] }) {
  const { language } = useLanguage();
  const c = homeCopy(language);
  if (!tours.length) return null;

  return (
    <section className="mx-auto max-w-[1280px] px-4 pt-24 md:px-8 md:pt-28">
      <SectionHeading eyebrow={c.featEyebrow} title={c.featHeadline} action={<Link href="/tours" className="font-semibold text-[#7CC4FF] hover:text-white">{c.seeAll} →</Link>} />
      <MobileRail gridClass="sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {tours.map((t) => {
          const title = nameIn(t.titles, language);
          const rating = formatRating(t.rating);
          return (
            <Link key={t.id} href={`/tours/${t.id}`} className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121D45] text-white transition-transform duration-300 hover:-translate-y-1">
              <div className="relative aspect-[16/10] bg-[#1B2A5E]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.image} alt={title} loading="lazy" className="h-full w-full object-cover" />
                <TravelerFavoriteBadge rating={t.rating} reviews={t.reviews} className="absolute left-3 top-3" />
                {t.isFree && (
                  <span className="font-data absolute right-3 top-3 rounded-md border border-[#7CC4FF] bg-[#0A1330]/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-[#7CC4FF]">{c.free}</span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2.5 p-5">
                <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[#A9B6D6]">{nameIn(t.cityNames, language)} · {t.duration}</p>
                <h3 className="font-display line-clamp-2 text-xl font-semibold leading-snug">{title}</h3>
                {t.quote && <p className="line-clamp-2 text-sm italic leading-relaxed text-[#C9D6F5]">“{t.quote}”</p>}
                <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-3.5 text-sm">
                  <span>
                    {rating && <><span className="text-[#F5B301]">★</span> <b>{rating}</b> </>}
                    <span className="text-[#A9B6D6]">· {c.reviews(formatCount(t.reviews, language))}</span>
                  </span>
                  <span className="font-semibold text-[#EAF54F]">{t.isFree ? c.free : `${t.currency} ${t.price}`}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </MobileRail>
    </section>
  );
}
