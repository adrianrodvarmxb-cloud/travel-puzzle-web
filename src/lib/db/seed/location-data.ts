/**
 * Location Data Mappings
 * 
 * These mappings provide actual names for countries and cities
 * since the FreeTour API only provides IDs.
 * 
 * TODO: Populate this with actual data from the API or a third-party service
 * For now, these are placeholders that should be updated with real data.
 */

import { TourAPI } from '@/types';

export const COUNTRY_NAMES: Record<number, { code: string; names: Record<string, string> }> = {
  // Example structure - populate with actual data
  // 1: {
  //   code: 'ES',
  //   names: {
  //     en: 'Spain',
  //     es: 'España',
  //     pt: 'Espanha',
  //     de: 'Spanien',
  //     fr: 'Espagne',
  //     it: 'Spagna',
  //   }
  // },
};

export const CITY_NAMES: Record<number, { countryId: number; names: Record<string, string> }> = {
  // Example structure - populate with actual data
  // 1: {
  //   countryId: 1,
  //   names: {
  //     en: 'Madrid',
  //     es: 'Madrid',
  //     pt: 'Madrid',
  //     de: 'Madrid',
  //     fr: 'Madrid',
  //     it: 'Madrid',
  //   }
  // },
};

/**
 * Get country name by ID and language
 * Falls back to placeholder if not found in mapping
 */
export function getCountryName(countryId: number, language: string): string {
  const country = COUNTRY_NAMES[countryId];
  return country?.names[language] || `Country ${countryId}`;
}

/**
 * Get city name by ID and language
 * Falls back to placeholder if not found in mapping
 */
export function getCityName(cityId: number, language: string): string {
  const city = CITY_NAMES[cityId];
  return city?.names[language] || `City ${cityId}`;
}

/**
 * Extract location data from existing tours.json file
 * Run this once to help populate the mappings above
 */
export async function extractLocationDataFromJSON() {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  try {
    const toursFile = path.join(process.cwd(), 'data', 'tours.json');
    const content = await fs.readFile(toursFile, 'utf-8');
    const data = JSON.parse(content);

    const countries = new Set<number>();
    const cities = new Set<number>();

    data.tours.forEach((tour: TourAPI) => {
      countries.add(tour.countryId);
      cities.add(tour.cityId);
    });

    console.log('Unique countries:', Array.from(countries).sort((a, b) => a - b));
    console.log('Unique cities:', Array.from(cities).sort((a, b) => a - b));

    // You can use this data to look up actual names from
    // external services like Google Places, RestCountries API, etc.
  } catch (error) {
    console.error('Error extracting location data:', error);
  }
}

