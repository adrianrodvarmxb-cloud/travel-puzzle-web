'use client';

import { useLanguage } from "@/lib/language-context";
import { ReviewCard } from "@/components/reviews";
import type { ReviewView } from "@/reviews/load";

/** Reseñas reales recientes (de FREETOUR.com). Si aún no hay, la sección no se muestra. */
export function RecentReviews({ reviews = [] }: { reviews?: ReviewView[] }) {
  const { t, language } = useLanguage();
  if (reviews.length === 0) return null;

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold mb-2 text-center">
          {t('home.recentReviews.title') || 'Recent Reviews'}
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-8">{t('reviews.source')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} language={language} />
          ))}
        </div>
      </div>
    </section>
  );
}
