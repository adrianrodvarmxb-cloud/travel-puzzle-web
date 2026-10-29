import countriesData from '../../../data/countires.json';
import { SupportedLanguage } from '@/types';

interface Country {
  id: number;
  title: {
    en: string;
    es: string;
    pt: string;
    de: string;
    fr: string;
    it: string;
  };
  shortTitle: string;
  URLs: {
    en: string;
    es: string;
    pt: string;
    de: string;
    fr: string;
    it: string;
  };
  image: string;
  continent: {
    en: string;
    es: string;
    pt: string;
    de: string;
    fr: string;
    it: string;
  };
}

const countries: Country[] = countriesData as Country[];

// Create a map for quick lookup
const countriesMap = new Map<number, Country>();
countries.forEach(country => {
  countriesMap.set(country.id, country);
});

/**
 * Get country name by ID in the specified language
 */
export function getCountryName(countryId: number, language: SupportedLanguage = 'en'): string {
  const country = countriesMap.get(countryId);
  return country ? country.title[language] : `Country ${countryId}`;
}

/**
 * Get all countries
 */
export function getAllCountries(): Country[] {
  return countries;
}

/**
 * Get country by ID
 */
export function getCountryById(countryId: number): Country | undefined {
  return countriesMap.get(countryId);
}

