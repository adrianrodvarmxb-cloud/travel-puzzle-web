'use client';

import { ReactNode, useState, useCallback } from 'react';
import { LanguageProvider } from '@/lib/language-context';
import { QueryProvider } from './QueryProvider';
import type { SupportedLanguage } from '@/types';
import { LanguageSuggestion } from '@/components/i18n/LanguageSuggestion';

/** REQ-654: `language` y `locked` llegan del servidor (idioma de la URL); sin ellos, todo como hoy. */
export function AppProviders({ children, language, locked = false }: { children: ReactNode; language?: SupportedLanguage; locked?: boolean }) {
  const [isLanguageReady, setIsLanguageReady] = useState(false);
  
  const handleLanguageReady = useCallback(() => {
    setIsLanguageReady(true);
  }, []);
  
  return (
    <LanguageProvider onReady={handleLanguageReady} initialLanguage={locked ? language : undefined} locked={locked}>
      <QueryProvider isReady={isLanguageReady}>
        {children}
      </QueryProvider>
      {locked && <LanguageSuggestion />}
    </LanguageProvider>
  );
}

