'use client';

import { StarIcon } from '@/assets/svg';
import { Card, CardContent } from '@/components/ui/Card';
import type { ReviewView } from '@/reviews/load';

const LOCALES: Record<string, string> = { en: 'en-US', es: 'es-MX', pt: 'pt-BR', de: 'de-DE', fr: 'fr-FR', it: 'it-IT' };

/** Una reseña real tal como la escribió el viajero (sin editar). */
export function ReviewCard({ review, language }: { review: ReviewView; language: string }) {
  const stars = Math.round(review.rate);
  const date = new Date(review.addedAt).toLocaleDateString(LOCALES[language] ?? 'en-US', { year: 'numeric', month: 'long' });

  return (
    <Card className="h-full">
      <CardContent className="p-5 flex flex-col gap-2 h-full">
        <div className="flex items-center gap-1" aria-label={`${review.rate} / 5`}>
          {Array.from({ length: 5 }, (_, i) => (
            <StarIcon
              key={i}
              className={`w-4 h-4 ${i < stars ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
            />
          ))}
        </div>
        {review.title && <p className="font-semibold">{review.title}</p>}
        <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-6">{review.content}</p>
        <p className="text-xs text-muted-foreground mt-auto pt-2">
          {review.reviewerName} · {date}
        </p>
      </CardContent>
    </Card>
  );
}
