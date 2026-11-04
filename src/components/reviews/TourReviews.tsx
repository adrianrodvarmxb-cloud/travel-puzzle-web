'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import { Card, CardContent } from '@/components/ui/Card';
import type { ReviewView } from '@/reviews/load';
import { ReviewCard } from './ReviewCard';

/** Sección de reseñas reales en la página de un tour. No se muestra si no hay reseñas. */
export function TourReviews({ reviews, total }: { reviews: ReviewView[]; total: number }) {
  const { t, language } = useLanguage();
  const [shown, setShown] = useState(6);
  if (reviews.length === 0) return null;

  return (
    <Card id="resenas" className="scroll-mt-24">
      <CardContent className="p-6">
        <h2 className="text-2xl font-bold mb-1">{t('reviews.tourTitle')}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t('reviews.total').replace('{count}', total.toLocaleString('es-MX'))} · {t('reviews.source')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.slice(0, shown).map((r) => (
            <ReviewCard key={r.id} review={r} language={language} />
          ))}
        </div>
        {shown < reviews.length && (
          <div className="mt-6 text-center">
            <button type="button" onClick={() => setShown((n) => n + 6)} className="rounded-xl border border-[#008DFF] px-6 py-3 font-semibold text-[#008DFF] hover:bg-[#008DFF] hover:text-white">
              {t('reviews.showMore', 'Show more reviews')}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
