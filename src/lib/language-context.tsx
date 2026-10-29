'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupportedLanguage } from '@/types';
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
}

interface LanguageProviderProps {
  children: ReactNode;
  onReady?: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children, onReady }: LanguageProviderProps) {
  // Always start with 'en' to match server-side rendering
  const [language, setLanguageState] = useState<SupportedLanguage>('en');
  const [isInitialized, setIsInitialized] = useState(false);

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

  // After hydration, detect and set the correct language
  useEffect(() => {
    // Check localStorage first
    const savedLanguage = localStorage.getItem('preferredLanguage') as SupportedLanguage;
    if (savedLanguage && translations[savedLanguage]) {
      // eslint-disable-next-line
      setLanguageState(savedLanguage);
      // Small delay to ensure content is ready
      setTimeout(() => {
        setIsInitialized(true);
        onReady?.();
      }, 100);
      return;
    }

    // Detect browser language
    const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
    if (translations[browserLang]) {
      setLanguageState(browserLang);
      localStorage.setItem('preferredLanguage', browserLang);
    }

    // Mark as initialized after language detection
    setTimeout(() => {
      setIsInitialized(true);
      onReady?.();
    }, 100);
  }, [onReady]);

  // Save language preference to localStorage
  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLanguage', lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isInitialized }}>
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

