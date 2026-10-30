'use client';

import { useLanguage } from '@/lib/language-context';
import { Card, CardContent } from '@/components/ui/Card';
import type { ReviewView } from '@/reviews/load';
import { ReviewCard } from './ReviewCard';

/** Sección de reseñas reales en la página de un tour. No se muestra si no hay reseñas. */
export function TourReviews({ reviews, total }: { reviews: ReviewView[]; total: number }) {
  const { t, language } = useLanguage();
  if (reviews.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-2xl font-bold mb-1">{t('reviews.tourTitle')}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t('reviews.total').replace('{count}', total.toLocaleString())} · {t('reviews.source')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} language={language} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
