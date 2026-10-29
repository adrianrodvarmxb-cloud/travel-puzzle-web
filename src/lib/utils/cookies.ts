import { cookies } from 'next/headers';
import { SupportedLanguage } from '@/types';

/**
 * Get preferred language from cookies, defaulting to 'en'
 */
export async function getPreferredLanguage(): Promise<SupportedLanguage> {
  const cookieStore = await cookies();
  const preferredLanguage = cookieStore.get('preferredLanguage')?.value;
  
  // Validate that it's a supported language
  const supportedLanguages: SupportedLanguage[] = ['en', 'es', 'pt', 'de', 'fr', 'it'];
  if (preferredLanguage && supportedLanguages.includes(preferredLanguage as SupportedLanguage)) {
    return preferredLanguage as SupportedLanguage;
  }
  
  return 'en';
}

