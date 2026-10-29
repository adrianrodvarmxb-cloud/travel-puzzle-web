'use client';

import { ReactNode, useState, useCallback } from 'react';
import { LanguageProvider } from '@/lib/language-context';
import { QueryProvider } from './QueryProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  const [isLanguageReady, setIsLanguageReady] = useState(false);
  
  const handleLanguageReady = useCallback(() => {
    setIsLanguageReady(true);
  }, []);
  
  return (
    <LanguageProvider onReady={handleLanguageReady}>
      <QueryProvider isReady={isLanguageReady}>
        {children}
      </QueryProvider>
    </LanguageProvider>
  );
}

