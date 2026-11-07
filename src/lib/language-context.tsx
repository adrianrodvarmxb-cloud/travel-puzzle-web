'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SupportedLanguage } from '@/types';
import { inScope, splitLocale } from '@/i18n/lib/path';
import { translations } from './translations';
import { LoadingPage } from '@/components/layout/LoadingPage';


interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: {
    (key: string): string;
    (key: string, fallback: string): string;
  };
  isInitialized: boolean;
  /** REQ-654/REQ-655 (Gate 3): true = el idioma sale de la URL; los enlaces llevan su prefijo. */
  locked: boolean;
}

interface LanguageProviderProps {
  children: ReactNode;
  onReady?: () => void;
  /** REQ-654: idioma que pintó el servidor (el de la URL). Sin él, español como siempre. */
  initialLanguage?: SupportedLanguage;
  /** REQ-654: con LOCALE_URLS_ENABLED y ruta en alcance, el idioma no cambia por localStorage ni por el navegador. */
  locked?: boolean;
}

/** El servidor lee el idioma de esta cookie (reseñas y catálogo en el idioma elegido). */
function writeLanguageCookie(lang: SupportedLanguage) {
  try {
    document.cookie = `preferredLanguage=${lang}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* sin cookies: el servidor usa español */
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children, onReady, initialLanguage, locked = false }: LanguageProviderProps) {
  // Español mientras se detecta el idioma (igual que el servidor); luego: el elegido o el del navegador.
  // REQ-654: con `locked`, el primer render usa el idioma que pintó el servidor (INC-001: SSR = cliente).
  const [language, setLanguageState] = useState<SupportedLanguage>(initialLanguage ?? 'es');
  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();

  // Translation function with overloads
  // Function overloads - declare multiple ways to call the function
  function t(key: string): string;
  function t(key: string, fallback: string): string;
  // Implementation signature - must be compatible with all overloads
  function t(key: string, fallback?: string): string {
    if (fallback !== undefined) {
      return translations[language]?.[key] || fallback;
    }
    return translations[language]?.[key] || key;
  }

  // REQ-654: navegación del cliente entre idiomas (el layout raíz no se vuelve a pintar): el idioma sigue a la URL.
  // Se lee window.location (no usePathname, que con el rewrite puede traer la ruta sin prefijo) y solo después de montar.
  useEffect(() => {
    if (!locked) return;
    const { lang, rest } = splitLocale(window.location.pathname);
    if (inScope(rest)) setLanguageState(lang);
  }, [locked, pathname]);

  // REQ-654: la cookie recuerda el último idioma de URL para las páginas sin versión por idioma (reserva, eventos, D7).
  useEffect(() => {
    if (locked) writeLanguageCookie(language);
  }, [locked, language]);

  // After hydration, detect and set the correct language
  useEffect(() => {
    // REQ-654: con el idioma en la URL, ni localStorage ni el navegador lo cambian (eso solo sugiere: REQ-657).
    if (locked) {
      setTimeout(() => {
        setIsInitialized(true);
        onReady?.();
      }, 0);
      return;
    }
    // Check localStorage first
    const savedLanguage = localStorage.getItem('preferredLanguage') as SupportedLanguage;
    if (savedLanguage && translations[savedLanguage]) {
      // eslint-disable-next-line
      setLanguageState(savedLanguage);
      writeLanguageCookie(savedLanguage);
      // Small delay to ensure content is ready
      setTimeout(() => {
        setIsInitialized(true);
        onReady?.();
      }, 100);
      return;
    }

    // Gate 1 (B): cada visitante en el idioma de su navegador; si no lo tenemos, español.
    const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
    if (translations[browserLang]) {
      setLanguageState(browserLang);
      localStorage.setItem('preferredLanguage', browserLang);
      writeLanguageCookie(browserLang);
    }

    // Mark as initialized after language detection
    setTimeout(() => {
      setIsInitialized(true);
      onReady?.();
    }, 100);
  }, [onReady, locked]);

  // Save language preference to localStorage (REQ-656: con `locked`, el selector además navega a la URL del idioma)
  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLanguage', lang);
      writeLanguageCookie(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isInitialized, locked }}>
      <LoadingPage isLoading={!isInitialized} />
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}


/** REQ-655: para enlaces que también se pintan fuera del provider (tests, correos): null si no hay provider. */
export function useOptionalLanguage(): LanguageContextType | null {
  return useContext(LanguageContext) ?? null;
}
