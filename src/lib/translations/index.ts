import { en } from './en';
import { es } from './es';
import { pt } from './pt';
import { de } from './de';
import { fr } from './fr';
import { it } from './it';
import { SupportedLanguage } from '@/types';

export const translations: Record<SupportedLanguage, Record<string, string>> = {
  en,
  es,
  pt,
  de,
  fr,
  it,
};

export type TranslationKey = keyof typeof en;

