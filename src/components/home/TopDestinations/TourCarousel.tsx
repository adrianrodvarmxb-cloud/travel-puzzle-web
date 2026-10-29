'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@/assets/svg';
import { TourCarouselCard } from './TourCarouselCard';
import tourData from './mock-tour-data.json';

interface Tour {
  id: number;
  name: string;
  description: string;
  location: string;
  price: number;
  image: string;
}

export function TourCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const tours: Tour[] = tourData;

  // Show 3 cards at a time
  const cardsPerView = 3;
  const maxIndex = Math.max(0, tours.length - cardsPerView);

  useEffect(() => {
    // Keep index within bounds
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [currentIndex, maxIndex]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(Math.min(Math.max(0, index), maxIndex));
  };

  // Calculate visible tours
  const visibleTours = tours.slice(currentIndex, currentIndex + cardsPerView);

  return (
    <div className="relative max-w-7xl mx-auto px-4">
      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        disabled={currentIndex === 0}
        className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white p-3 rounded-full shadow-xl transition-all duration-300 ${currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
      >
        <ChevronLeftIcon className="h-6 w-6" />
      </button>
      <button
        onClick={goToNext}
        disabled={currentIndex >= maxIndex}
        className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white p-3 rounded-full shadow-xl transition-all duration-300 ${currentIndex >= maxIndex ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
      >
        <ChevronRightIcon className="h-6 w-6" />
      </button>

      {/* Carousel Container */}
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * (100 / cardsPerView)}%)` }}
        >
          {tours.map((tour, index) => (
            <div
              key={tour.id}
              className="shrink-0 px-3"
              style={{ width: `${100 / cardsPerView}%` }}
            >
              <TourCarouselCard tour={tour} rank={index + 1} />
            </div>
          ))}
        </div>
      </div>

      {/* Indicators */}
      <div className="flex justify-center space-x-2 mt-8">
        {Array.from({ length: Math.ceil(tours.length / cardsPerView) }).map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index * cardsPerView)}
            className={`w-3 h-3 rounded-full transition-all duration-300 cursor-pointer ${Math.floor(currentIndex / cardsPerView) === index
              ? 'bg-orange-400 scale-125'
              : 'bg-white/30 hover:bg-white/50'
              }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

