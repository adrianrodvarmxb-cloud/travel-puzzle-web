import { TourAPI, SupportedLanguage } from '@/types';
import { getCountryName } from './countries';

export interface TourFilters {
  search?: string;
  countryId?: number;
  cityId?: number;
  minPrice?: number;
  maxPrice?: number;
}

export function filterTours(
  tours: TourAPI[],
  filters: TourFilters,
  language: 'en' | 'es' | 'pt' | 'de' | 'fr' | 'it' = 'en'
): TourAPI[] {
  let filtered = tours;

  // Country filter
  if (filters.countryId) {
    filtered = filtered.filter(tour => tour.countryId === filters.countryId);
  }

  // City filter
  if (filters.cityId) {
    filtered = filtered.filter(tour => tour.cityId === filters.cityId);
  }

  // Price range filter
  if (filters.minPrice !== undefined) {
    filtered = filtered.filter(tour => tour.price.value >= filters.minPrice!);
  }
  if (filters.maxPrice !== undefined) {
    filtered = filtered.filter(tour => tour.price.value <= filters.maxPrice!);
  }

  // Full-text search (title + brief + description)
  if (filters.search && filters.search.trim()) {
    const searchLower = filters.search.toLowerCase().trim();
    filtered = filtered.filter(tour => {
      const title = tour.title[language]?.toLowerCase() || '';
      const brief = tour.brief[language]?.toLowerCase() || '';
      const description = tour.description[language]?.toLowerCase() || '';
      const destination = tour.meetingPoint.title.toLowerCase();
      
      return (
        title.includes(searchLower) ||
        brief.includes(searchLower) ||
        description.includes(searchLower) ||
        destination.includes(searchLower)
      );
    });
  }

  return filtered;
}

export function getUniqueCountries(tours: TourAPI[], language: SupportedLanguage = 'en'): Array<{ id: number; name: string }> {
  const countryIds = new Set<number>();
  
  tours.forEach(tour => {
    countryIds.add(tour.countryId);
  });

  return Array.from(countryIds)
    .map(id => ({
      id,
      name: getCountryName(id, language)
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getUniqueCities(tours: TourAPI[], countryId?: number): Array<{ id: number; name: string }> {
  let filtered = tours;
  if (countryId) {
    filtered = tours.filter(tour => tour.countryId === countryId);
  }

  const cityMap = new Map<number, string>();
  
  filtered.forEach(tour => {
    if (!cityMap.has(tour.cityId)) {
      cityMap.set(tour.cityId, tour.meetingPoint.title);
    }
  });

  return Array.from(cityMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

