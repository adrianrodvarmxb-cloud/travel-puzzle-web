'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { ReviewCard } from '@/components/reviews';
import { nameIn } from '@/home/lib/destinations';
import type { HomeReview } from '@/home/load';

/** Reseñas reales de 5 ★ de tours distintos; cada una lleva a su tour. */
export function HomeReviews({ reviews }: { reviews: HomeReview[] }) {
  const { t, language } = useLanguage();
  if (!reviews.length) return null;

  return (
    <section className="px-4 py-16">
      <div className="container mx-auto max-w-6xl">
        <h2 className="mb-2 text-center text-3xl font-bold text-[#0A1330]">{t('home.recentReviews.title', 'What travelers say')}</h2>
        <p className="mb-8 text-center text-sm text-muted-foreground">{t('reviews.source')}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => {
            const card = <ReviewCard review={r} language={language} />;
            if (!r.tour) return <div key={r.id}>{card}</div>;
            const title = nameIn(r.tour.titles, language);
            return (
              <Link key={r.id} href={`/tours/${r.tour.id}`} className="group flex flex-col rounded-xl transition-shadow hover:shadow-lg">
                <div className="flex-1">{card}</div>
                <p className="mt-2 px-1 text-sm">
                  <span className="font-semibold text-[#0A1330] group-hover:text-[#008DFF]">{title}</span>
                  <span className="text-muted-foreground"> · {nameIn(r.tour.cityNames, language)}</span>
                  <span className="ml-1 font-semibold text-[#008DFF]">{t('reviews.seeTour', 'See tour')} →</span>
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
