'use server';

import { loadTourHighlights } from '@/reviews/load';
import {
  getToursWithFilters,
  getTourById,
  getTourByExternalId,
  getCountriesWithTourCount,
  getCitiesWithTourCount,
  getToursMetadata,
  type TourFilters,
} from '@/lib/db/repositories/tour-repository';
import { syncToursFromAPI } from '@/lib/db/sync/tour-sync';
import { freeTourClient } from '@/lib/api/freetour-client';
import type { PaginationParams } from '@/lib/db/pagination';
import { withRetry, createTtlCache } from '@/tours/lib/d1-load';

// INC-003: cachés por isolate para no saturar D1 (no se exportan: archivo de server actions).
const TEN_MIN = 10 * 60 * 1000;
const countriesCache = createTtlCache<Awaited<ReturnType<typeof getCountriesWithTourCount>>>({ ttlMs: TEN_MIN });
const metadataCache = createTtlCache<Awaited<ReturnType<typeof getToursMetadata>>>({ ttlMs: TEN_MIN });

/**
 * Serialize Prisma Decimals and Dates to plain values for client components
 */
function serializeDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  
  // Check if it's a Decimal by looking for toNumber method
  if (typeof obj === 'object' && 'toNumber' in obj && typeof obj.toNumber === 'function') {
    return obj.toNumber() as T;
  }
  
  // Convert Date to ISO string
  if (obj instanceof Date) {
    return obj.toISOString() as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeDecimals) as T;
  }
  
  if (typeof obj === 'object') {
    const serialized: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeDecimals(obj[key]);
      }
    }
    return serialized as T;
  }
  
  return obj;
}

/**
 * Fetch tours with filters and pagination
 */
export async function fetchTours(
  filters: TourFilters = {},
  pagination: PaginationParams = {}
) {
  try {
    const result = await withRetry(() => getToursWithFilters(filters, pagination)); // REQ-029
    const serialized = serializeDecimals(result);
    // Final JSON round-trip to ensure everything is plain objects
    return JSON.parse(JSON.stringify(serialized));
  } catch (error) {
    console.error('Error fetching tours:', error);
    throw new Error('Failed to fetch tours');
  }
}

/**
 * Fetch a single tour by ID
 */
export async function fetchTourById(tourId: string, language: string = 'en') {
  try {
    const result = await getTourById(tourId, language);
    const serialized = serializeDecimals(result);
    return JSON.parse(JSON.stringify(serialized));
  } catch (error) {
    console.error('Error fetching tour:', error);
    throw new Error('Failed to fetch tour');
  }
}

/**
 * Fetch a single tour by external ID
 */
export async function fetchTourByExternalId(externalId: number, language: string = 'en') {
  try {
    const result = await getTourByExternalId(externalId, language);
    const serialized = serializeDecimals(result);
    return JSON.parse(JSON.stringify(serialized));
  } catch (error) {
    console.error('Error fetching tour by external ID:', error);
    throw new Error('Failed to fetch tour');
  }
}

/**
 * Fetch countries with tour count for filters
 */
export async function fetchCountries(language: string = 'en') {
  try {
    // REQ-029/REQ-030: los países casi no cambian; se guardan 10 min por isolate.
    const result = await countriesCache.get(language, () => withRetry(() => getCountriesWithTourCount(language)));
    const serialized = serializeDecimals(result);
    return JSON.parse(JSON.stringify(serialized));
  } catch (error) {
    console.error('Error fetching countries:', error);
    throw new Error('Failed to fetch countries');
  }
}

/**
 * Fetch cities with tour count for filters
 */
export async function fetchCities(countryId?: number, language: string = 'en') {
  try {
    const result = await getCitiesWithTourCount(countryId, language);
    const serialized = serializeDecimals(result);
    return JSON.parse(JSON.stringify(serialized));
  } catch (error) {
    console.error('Error fetching cities:', error);
    throw new Error('Failed to fetch cities');
  }
}

/**
 * Fetch cities directly from FreeTour API
 */
export async function fetchCitiesFromAPI(countryId: number, language: string = 'en') {
  try {
    const response = await freeTourClient.fetchCities(countryId);
    
    // Transform to simple format with current language
    const cities = response.data.map(city => ({
      id: city.id,
      name: city.title[language as keyof typeof city.title] || city.title.en,
    }));
    
    return cities;
  } catch (error) {
    console.error('Error fetching cities from API:', error);
    throw new Error('Failed to fetch cities');
  }
}

/**
 * Get tours metadata (last sync, total count, etc.)
 */
export async function fetchToursMetadata() {
  try {
    return await metadataCache.get('freetour', () => withRetry(() => getToursMetadata())); // REQ-029/REQ-030
  } catch (error) {
    console.error('Error fetching tours metadata:', error);
    return {
      lastUpdated: null,
      totalTours: 0,
      syncStatus: 'error',
    };
  }
}

/**
 * Sync tours from FreeTour API to database
 * This should be called manually or via a cron job
 */
export async function syncTours(maxPages?: number) {
  try {
    return await syncToursFromAPI(maxPages);
  } catch (error) {
    console.error('Error syncing tours:', error);
    throw new Error('Failed to sync tours');
  }
}


/** Frases destacadas de reseñas reales para las tarjetas de la lista de tours. */
export async function fetchTourHighlights(tourExternalIds: number[], language: string = 'es') {
  const ids = tourExternalIds.filter((n) => Number.isInteger(n) && n > 0).slice(0, 50);
  return loadTourHighlights(ids, language);
}
