'use server';

import { taxonomyFiltersEnabled } from '@/taxonomy/lib/filters';
import { loadTourHighlights } from '@/reviews/load';
import {
  getToursWithFilters,
  getToursFromCatalog,
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
import { withRetry } from '@/tours/lib/d1-load';
import { cached, cacheKey, POLICY } from '@/cache/edge';
import { priceLabelsFor, type CardPriceLabels } from '@/tours/lib/price-label';
import { isPrimeraPiezaEnabled } from '@/tours/lib/menu';
import { cityNamesOf } from '@/taxonomy/lib/text';
import { cardFormatsFor } from '@/tours/lib/card-format';
import { loadFx } from '@/trips/public-load';
import { getDestinations } from '@/destinations/server';
import { canonicalHrefs } from '@/seo/lib/itemlist';
import { withFinalHref } from '@/tours/lib/card-sources';

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
  clientFilters: TourFilters = {},
  pagination: PaginationParams = {}
) {
  // T4 (REQ-413): la bandera la decide el servidor, nunca el cliente; apagada, ?formato= no filtra nada.
  const taxonomy = taxonomyFiltersEnabled(process.env as Record<string, string | undefined>);
  const filters: TourFilters = { ...clientFilters, taxonomy, formatos: taxonomy ? clientFilters.formatos ?? [] : [], temas: taxonomy ? clientFilters.temas ?? [] : [], atributos: taxonomy ? clientFilters.atributos ?? [] : [] }; // REQ-1421 / REQ-1422
  try {
    // REQ-032: caché compartida (L1+L2) con single-flight; REQ-029: reintento si D1 está saturada.
    const list = await cached(cacheKey('tours', { ...filters, ...pagination, v: 'temas-1421' /* REQ-1250: las filas traen el formato del índice; REQ-1421/1422: temas y atributos */ }), POLICY.toursList, async () => {
      const result = await withRetry(() => getToursFromCatalog(filters, pagination));
      return JSON.parse(JSON.stringify(serializeDecimals(result)));
    });
    type Row = { id: string; priceValue?: number | string; priceCurrency?: string; categoryId?: number; durationMinutes?: number | null; providerId?: string; translations?: { title?: string }[]; formato?: string; city?: { translations?: unknown } };
    const rows = ((list as { data?: Row[] }).data ?? []);
    // REQ-522: formato de la taxonomía de cada tarjeta, calculado aquí (el diccionario no viaja al navegador).
    // REQ-548: si la fila trae el formato del índice del catálogo (el que filtran los chips), ese manda.
    const cardFormats = { ...cardFormatsFor(rows.map((t) => ({ id: t.id, categoryId: t.categoryId, price: t.priceValue, durationMinutes: t.durationMinutes, providerId: t.providerId, titles: (t.translations ?? []).map((x) => x.title), cities: cityNamesOf(t.city?.translations) }))), ...Object.fromEntries(rows.filter((t) => t.formato).map((t) => [t.id, t.formato as string])) };
    // REQ-170: con PRIMERA_PIEZA_ENABLED, EUR + «aprox. MXN» de cada tarjeta, armado aquí (servidor, idioma fijo; INC-001).
    if (!isPrimeraPiezaEnabled(process.env.PRIMERA_PIEZA_ENABLED)) return { ...list, cardFormats };
    // REQ-668 (Gate 3): ficha final de cada tarjeta (sin el 301 de /tours/{id}); si el árbol falla, sin resolver.
    const resolve = canonicalHrefs(await getDestinations().catch(() => null));
    const fin = withFinalHref(resolve);
    const cardHrefs: Record<string, string> = Object.fromEntries(rows.map((t) => [t.id, fin(t).href]));
    const paid = rows.filter((t) => Number(t.priceValue ?? 0) > 0);
    const rates = paid.length ? await loadFx().catch(() => null) : null;
    const priceLabels: CardPriceLabels = priceLabelsFor(paid.map((t) => ({ id: t.id, price: t.priceValue, currency: t.priceCurrency })), rates, filters.language === 'es' ? 'es' : 'en');
    return { ...list, priceLabels, cardFormats, cardHrefs };
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
    return await cached(cacheKey('tour', { tourId, language }), POLICY.tourDetail, async () => { // REQ-032
      const result = await withRetry(() => getTourById(tourId, language));
      return JSON.parse(JSON.stringify(serializeDecimals(result)));
    });
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
    // REQ-029/REQ-032: los países casi no cambian; caché compartida 1 h.
    const result = await cached(cacheKey('countries', { language, v: 'iso-1265' /* REQ-1265 */ }), POLICY.countries, () => withRetry(() => getCountriesWithTourCount(language)));
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
    return await cached('tours-metadata', POLICY.metadata, () => withRetry(() => getToursMetadata())); // REQ-029/REQ-030
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
  // REQ-032: caché compartida 1 h (la consulta de reseñas leía ~39 mil filas por llamada).
  return cached(cacheKey('highlights', { ids: [...ids].sort((a, b) => a - b).join(','), language }), { ttlSec: 3600, staleSec: 86400 },
    () => withRetry(() => loadTourHighlights(ids, language)));
}
