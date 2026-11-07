'use client';

import { useCallback } from 'react';
import { useOptionalLanguage } from '@/lib/language-context';
import { localizePath } from '@/i18n/lib/path';

/**
 * REQ-655: el mismo enlace en el idioma de la URL. Sin idioma en la URL (bandera apagada) o sin provider,
 * regresa el href tal cual.
 */
export function useLocalizedHref(): (href: string) => string {
  const ctx = useOptionalLanguage();
  const language = ctx?.language ?? 'es';
  const locked = ctx?.locked ?? false;
  return useCallback((href: string) => (locked ? localizePath(href, language) : href), [language, locked]);
}
