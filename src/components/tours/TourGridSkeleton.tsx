import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';

interface TourGridSkeletonProps {
  count?: number;
}

export const TourGridSkeleton: React.FC<TourGridSkeletonProps> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="h-full">
          {/* Image skeleton */}
          <div className="relative h-48 w-full bg-linear-to-br from-gray-200 via-gray-300 to-gray-200 rounded-t-lg animate-pulse" />

          {/* Content skeleton */}
          <CardContent className="p-4 space-y-3">
            {/* Title skeleton */}
            <div className="h-6 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse" />

            {/* Brief skeleton */}
            <div className="h-4 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse" />

            {/* Bottom info skeleton */}
            <div className="flex items-center justify-between mt-4">
              <div className="space-y-2">
                <div className="h-3 w-20 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse" />
                <div className="h-3 w-16 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse" />
              </div>
              <div className="space-y-2 text-right">
                <div className="h-5 w-20 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse ml-auto" />
                <div className="h-3 w-16 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse ml-auto" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

