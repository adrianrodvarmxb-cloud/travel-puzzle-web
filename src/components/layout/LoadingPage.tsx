'use client';

import { useEffect, useState } from 'react';
import { Logo } from './Logo';
import { PlatformTextLogo } from './PlatformTextLogo';

interface LoadingPageProps {
  isLoading: boolean;
}

export const LoadingPage = ({ isLoading }: LoadingPageProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Start fade out animation
      setTimeout(() => {
        setIsFading(true);
      }, 100);

      // Remove from DOM after animation completes
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300); // Match the transition duration

      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-9999 flex items-center justify-center bg-background transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'
        }`}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Logo */}
        <Logo size="lg" shape="circle" />
        <PlatformTextLogo size="lg" color="text-[var(--tp-blue-primary)]" />

        {/* Loading spinner */}
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

