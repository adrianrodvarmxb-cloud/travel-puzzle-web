'use client';

import React from 'react';
import Image from 'next/image';
import { HeartIcon, ShareIcon, StarIcon, ClockIcon, MapPinIcon, EuroIcon } from '@/assets/svg';
import { useLanguage } from '@/lib/language-context';

interface Tour {
  id: number;
  name: string;
  description: string;
  location: string;
  price: number;
  image: string;
}

interface TourCarouselCardProps {
  tour: Tour;
  rank: number;
}

export function TourCarouselCard({ tour, rank }: TourCarouselCardProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 group hover:scale-105">
      {/* Image Section */}
      <div className="relative h-64 overflow-hidden">
        <Image
          src={tour.image}
          alt={tour.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Top Section - Badge and Action Buttons */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
            #{rank}
          </div>
          <div className="flex space-x-2">
            <button className="p-2 rounded-full transition-colors bg-white/20 backdrop-blur-sm text-white hover:bg-white/30">
              <HeartIcon className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors">
              <ShareIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bottom Section - Rating and Duration */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                <StarIcon className="h-3 w-3 text-yellow-400 fill-current" />
              </div>
              <div className="flex items-center space-x-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                <ClockIcon className="h-3 w-3 text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900 line-clamp-2 grow">
            {tour.name}
          </h3>
        </div>
        <p className="text-gray-600 text-sm line-clamp-3 mb-4">
          {tour.description}
        </p>
        <div className="flex items-center space-x-2 mb-4">
          <MapPinIcon className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600 text-sm">{tour.location}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 flex items-center">
              <EuroIcon className="h-5 w-5" />
              {tour.price}
            </div>
          </div>
          <button className="bg-linear-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
            {t('home.topDestinations.book')}
          </button>
        </div>
      </div>
    </div>
  );
}

