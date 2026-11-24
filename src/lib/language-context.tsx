'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SupportedLanguage } from '@/types';
import { inScope, splitLocale } from '@/i18n/lib/path';
import { isLocale } from '@/i18n/lib/locales';
import { translate, initialDictionaries, withDictionary, type Dictionaries, type Dictionary } from '@/i18n/lib/dictionary';
import { loadDictionary, esDictionary } from '@/i18n/load-dictionary';
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
  /** REQ-10869: diccionario del idioma que pintó el servidor (solo si no es español), para que el cliente hidrate igual sin descargar los 6. */
  initialDictionary?: Dictionary;
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

export function LanguageProvider({ children, onReady, initialLanguage, locked = false, initialDictionary }: LanguageProviderProps) {
  // Español mientras se detecta el idioma (igual que el servidor); luego: el elegido o el del navegador.
  // REQ-654: con `locked`, el primer render usa el idioma que pintó el servidor (INC-001: SSR = cliente).
  const [language, setLanguageState] = useState<SupportedLanguage>(initialLanguage ?? 'es');
  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();
  // REQ-10869: diccionarios ya descargados (español siempre; los demás bajo demanda).
  const [dicts, setDicts] = useState<Dictionaries>(() => initialDictionaries(esDictionary, initialLanguage, initialDictionary));
  const dictsRef = useRef(dicts);
  dictsRef.current = dicts;

  /** REQ-10869: cambia al idioma cuando su diccionario ya está; mientras baja, se queda el anterior. Si falla la descarga, no cambia. */
  const applyLanguage = (lang: SupportedLanguage): Promise<boolean> => {
    if (dictsRef.current[lang]) {
      setLanguageState(lang);
      return Promise.resolve(true);
    }
    return loadDictionary(lang).then(
      (dict) => {
        dictsRef.current = withDictionary(dictsRef.current, lang, dict);
        setDicts(dictsRef.current);
        setLanguageState(lang);
        return true;
      },
      () => false,
    );
  };

  // Translation function with overloads
  // Function overloads - declare multiple ways to call the function
  function t(key: string): string;
  function t(key: string, fallback: string): string;
  // Implementation signature - must be compatible with all overloads
  function t(key: string, fallback?: string): string {
    return translate(dicts, language, key, fallback);
  }

  // REQ-654: navegación del cliente entre idiomas (el layout raíz no se vuelve a pintar): el idioma sigue a la URL.
  // Se lee window.location (no usePathname, que con el rewrite puede traer la ruta sin prefijo) y solo después de montar.
  useEffect(() => {
    if (!locked) return;
    const { lang, rest } = splitLocale(window.location.pathname);
    if (inScope(rest)) void applyLanguage(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const ready = () =>
      setTimeout(() => {
        setIsInitialized(true);
        onReady?.();
      }, 100);
    if (isLocale(savedLanguage)) {
      writeLanguageCookie(savedLanguage);
      // REQ-10869: la pantalla de carga sigue hasta que baja el diccionario (o falla: queda español).
      void applyLanguage(savedLanguage).then(ready);
      return;
    }

    // Gate 1 (B): cada visitante en el idioma de su navegador; si no lo tenemos, español.
    const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
    if (isLocale(browserLang)) {
      localStorage.setItem('preferredLanguage', browserLang);
      writeLanguageCookie(browserLang);
      void applyLanguage(browserLang).then(ready);
      return;
    }

    // Mark as initialized after language detection
    ready();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onReady, locked]);

  // Save language preference to localStorage (REQ-656: con `locked`, el selector además navega a la URL del idioma)
  const setLanguage = (lang: SupportedLanguage) => {
    void applyLanguage(lang);
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
