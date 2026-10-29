import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Tour } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface TourCardProps {
  tour: Tour;
}

export const TourCard: React.FC<TourCardProps> = ({ tour }) => {
  // Get the first valid image URL
  const imageUrl = tour.images.find(img => img && img.trim() !== '');
  
  return (
    <Link href={`/tours/${tour.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="relative h-48 w-full bg-linear-to-br from-tp-blue-primary to-tp-blue-dark">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={tour.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover rounded-t-lg"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white text-center p-4">
              <span className="text-2xl font-bold opacity-50">🌍</span>
            </div>
          )}
          {tour.price === 0 && (
            <div className="absolute top-2 right-2">
              <Badge variant="success">FREE</Badge>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-bold text-lg mb-2 line-clamp-2">{tour.title}</h3>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {tour.brief}
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{tour.destination}</p>
              <p className="text-xs text-muted-foreground">{tour.duration}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">
                {tour.price > 0 ? `${tour.currency} ${tour.price}` : 'FREE'}
              </p>
              {tour.rating && (
                <p className="text-xs text-muted-foreground">
                  ⭐ {tour.rating} ({tour.reviewsNumber})
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

