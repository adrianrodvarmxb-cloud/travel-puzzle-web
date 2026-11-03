'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import { nameIn } from '@/home/lib/destinations';
import { formatCount, formatRating } from '@/home/lib/format';
import type { HomeTour } from '@/home/load';
import { SectionHeading } from './SectionHeading';
import { TravelerFavoriteBadge } from '@/components/tours/TravelerFavoriteBadge';

export function FeaturedTours({ tours }: { tours: HomeTour[] }) {
  const { language } = useLanguage();
  const c = homeCopy(language);
  if (!tours.length) return null;

  return (
    <section className="bg-[#0A1330] bg-[linear-gradient(160deg,#0A1330_0%,#14214D_55%,#304A9F_100%)] px-4 py-16">
      <div className="container mx-auto max-w-6xl">
        <SectionHeading eyebrow="02 — Favoritos" title={c.featTitle} subtitle={c.featSub} dark />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((t) => {
            const title = nameIn(t.titles, language);
            const rating = formatRating(t.rating);
            return (
              <Link key={t.id} href={`/tours/${t.id}`} className="group overflow-hidden rounded-2xl bg-white shadow-lg transition-transform hover:-translate-y-1">
                <div className="relative aspect-[16/10] bg-[#14214D]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.image} alt={title} loading="lazy" className="h-full w-full object-cover" />
                  <TravelerFavoriteBadge rating={t.rating} reviews={t.reviews} className="absolute left-3 top-3" />
                  {t.isFree && (
                    <span className="absolute right-3 top-3 rounded-md border border-[#008DFF] bg-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#008DFF]">{c.free}</span>
                  )}
                </div>
                <div className="p-5">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-gray-500">{nameIn(t.cityNames, language)} · {t.duration}</p>
                  <h3 className="mt-1 line-clamp-2 text-lg font-bold text-[#0A1330]">{title}</h3>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {rating && <><span className="text-[#F5B301]">★</span> <b className="text-[#0A1330]">{rating}</b> · </>}
                      {c.reviews(formatCount(t.reviews, language))}
                    </span>
                    <span className="font-bold text-[#0A1330]">{t.isFree ? c.free : `${t.currency} ${t.price}`}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-10 text-center">
          <Link href="/tours" className="inline-block rounded-xl bg-[#C12909] px-8 py-3.5 font-semibold text-white hover:opacity-90">{c.seeAll} →</Link>
        </div>
      </div>
    </section>
  );
}
