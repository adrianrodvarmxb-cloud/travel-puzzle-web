'use client';

import { useLanguage } from "@/lib/language-context";
import { StarIcon } from '@/assets/svg';
import { TourCarousel } from './TourCarousel';
import { useEffect, useRef, useState } from 'react';

export function TopDestinations() {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="top20-carousel"
      className="relative w-full bg-linear-to-br from-gray-900 via-blue-900 to-indigo-900 py-16"
    >
      <div className="relative w-full py-16">
        {/* Header Section */}
        <div className={`text-center mb-12 px-4 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
          <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 mb-6">
            <StarIcon className="h-6 w-6 text-yellow-400 fill-current" />
            <span className="text-white text-xl font-bold">
              {t('home.topDestinations.badge')}
            </span>
            <StarIcon className="h-6 w-6 text-yellow-400 fill-current" />
          </div>
          <h2 className="text-5xl font-bold text-white mb-4">
            {t('home.topDestinations.title')}
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            {t('home.topDestinations.subtitle')}
          </p>
        </div>

        {/* Carousel */}
        <TourCarousel />
      </div>
    </section>
  );
}
