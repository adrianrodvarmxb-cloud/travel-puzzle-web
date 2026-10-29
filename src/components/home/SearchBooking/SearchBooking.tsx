'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from "@/lib/language-context";
import { ImageCarousel } from "@/components/ui/ImageCarousel";
import { SearchFormPill } from './SerchFormPill';

export function SearchBooking() {
  const { t } = useLanguage();
  const [images, setImages] = useState<string[]>([]);

  // Load images from JSON file
  useEffect(() => {
    fetch('/search-section-images.json')
      .then((res) => res.json())
      .then((data) => setImages(data))
      .catch((err) => console.error('Failed to load search section images:', err));
  }, []);

  return (
    <section className="relative h-[600px] md:h-[700px] overflow-hidden bg-linear-to-br from-blue-900 to-blue-700">
      <ImageCarousel
        images={images}
        autoRotateInterval={5000}
        showDots={true}
        showOverlay={true}
        overlayOpacity="bg-black/40"
        className="absolute inset-0"
        altPrefix="Search section background"
        childrenClassName="container v-center"
      >
        {/* Content Overlay */}
        <div className="">
          {/* Title and Subtitle */}
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white drop-shadow-lg">
              {t('home.searchBooking.title', 'Search & Book Your Adventure')}
            </h2>
            <p className="text-xl md:text-2xl text-white/90 drop-shadow-md">
              {t('home.searchBooking.subtitle', 'Plan better with 300,000+ travel experiences')}
            </p>
          </div>

          {/* Search Form Placeholder */}
          <SearchFormPill />
        </div>
      </ImageCarousel>
    </section>
  );
}
