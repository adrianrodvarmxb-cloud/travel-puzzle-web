'use client';

import { useState, useEffect, ReactNode } from 'react';

export interface ImageCarouselProps {
  images: string[];
  autoRotateInterval?: number; // in milliseconds
  showDots?: boolean;
  showOverlay?: boolean;
  overlayOpacity?: string;
  className?: string;
  imageClassName?: string;
  altPrefix?: string;
  children?: ReactNode;
  childrenClassName?: string;
}

export function ImageCarousel({
  images,
  autoRotateInterval = 5000,
  showDots = true,
  showOverlay = true,
  overlayOpacity = 'bg-black/40',
  className = '',
  imageClassName = '',
  altPrefix = 'Carousel image',
  children,
  childrenClassName = '',
}: ImageCarouselProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Auto-rotate images
  useEffect(() => {
    if (images.length <= 1 || !autoRotateInterval) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, autoRotateInterval);

    return () => clearInterval(interval);
  }, [images.length, autoRotateInterval]);

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Background Images */}
      <div className="absolute inset-0 w-full h-full z-0">
        {images.map((imageUrl, index) => (
          <div
            key={index}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
              index === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Optional overlay */}
            {showOverlay && (
              <div className={`absolute inset-0 ${overlayOpacity}`} />
            )}
          </div>
        ))}
      </div>

      {/* Children Content - Rendered above images but below dots */}
      {children && (
        <div className={`relative z-20 w-full h-full ${childrenClassName}`}>
          {children}
        </div>
      )}

      {/* Carousel Dots */}
      {showDots && images.length > 1 && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToImage(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentImageIndex
                  ? 'bg-white w-8'
                  : 'bg-white/50 hover:bg-white/75 w-2'
              }`}
              aria-label={`Go to ${altPrefix} ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

