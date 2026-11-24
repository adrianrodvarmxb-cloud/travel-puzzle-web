'use client';

import { ReactNode, useState, useCallback } from 'react';
import { LanguageProvider } from '@/lib/language-context';
import { QueryProvider } from './QueryProvider';
import type { SupportedLanguage } from '@/types';
import type { Dictionary } from '@/i18n/lib/dictionary';
import { LanguageSuggestion } from '@/components/i18n/LanguageSuggestion';

/** REQ-654: `language` y `locked` llegan del servidor (idioma de la URL); sin ellos, todo como hoy.
 *  REQ-10869: `dictionary` es el diccionario de ese idioma (solo si no es español), para no bajar los 6 en el navegador. */
export function AppProviders({ children, language, locked = false, dictionary }: { children: ReactNode; language?: SupportedLanguage; locked?: boolean; dictionary?: Dictionary }) {
  const [isLanguageReady, setIsLanguageReady] = useState(false);
  
  const handleLanguageReady = useCallback(() => {
    setIsLanguageReady(true);
  }, []);
  
  return (
    <LanguageProvider onReady={handleLanguageReady} initialLanguage={locked ? language : undefined} locked={locked} initialDictionary={locked ? dictionary : undefined}>
      <QueryProvider isReady={isLanguageReady}>
        {children}
      </QueryProvider>
      {locked && <LanguageSuggestion />}
    </LanguageProvider>
  );
}

