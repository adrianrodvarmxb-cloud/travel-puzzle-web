import React from 'react';

export function TourAvailabilityCalendarSkeleton() {
  return (
    <div className="space-y-4">
      {/* Month Navigation Skeleton */}
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-full bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
        <div className="h-9 w-32 rounded-full bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
        <div className="w-9 h-9 rounded-full bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
      </div>

      {/* Days of Week Header Skeleton */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="h-8 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse"
          />
        ))}
      </div>

      {/* Calendar Grid Skeleton */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {Array.from({ length: 42 }).map((_, index) => (
          <div
            key={index}
            className="aspect-square rounded-full bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse"
          />
        ))}
      </div>

      {/* Divider */}
      <div className="border-t my-4" />

      {/* Selected Date Display Skeleton */}
      <div className="space-y-4">
        <div className="h-5 w-48 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse" />

        {/* Language and Times Skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, langIndex) => (
            <div key={langIndex} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
                <div className="h-4 w-20 bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-4 h-4 rounded bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
                {Array.from({ length: 2 }).map((_, timeIndex) => (
                  <div
                    key={timeIndex}
                    className="h-8 w-20 rounded-full bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t my-4" />
    </div>
  );
}

