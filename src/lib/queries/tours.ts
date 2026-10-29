'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  fetchTours,
  fetchTourById,
  fetchTourByExternalId,
  fetchCountries,
  fetchCities,
  fetchCitiesFromAPI,
  fetchToursMetadata,
  syncTours,
} from '@/actions/tours';
import type { TourFilters } from '@/lib/db/repositories/tour-repository';
import type { PaginationParams } from '@/lib/db/pagination';
import { Tour, CountryWithTranslations } from '@/types';

// Query Keys Factory
export const tourKeys = {
  all: ['tours'] as const,
  lists: () => [...tourKeys.all, 'list'] as const,
  list: (filters: TourFilters, pagination: PaginationParams) =>
    [...tourKeys.lists(), { filters, pagination }] as const,
  details: () => [...tourKeys.all, 'detail'] as const,
  detail: (id: string, language?: string) => 
    [...tourKeys.details(), id, language || 'en'] as const,
  detailByExternalId: (externalId: number) => [...tourKeys.details(), 'external', externalId] as const,
  metadata: () => [...tourKeys.all, 'metadata'] as const,
  countries: () => ['countries'] as const,
  countriesWithLang: (language: string) => [...tourKeys.countries(), language] as const,
  cities: () => ['cities'] as const,
  citiesWithFilters: (countryId?: number, language?: string) =>
    [...tourKeys.cities(), { countryId, language }] as const,
  citiesFromAPI: (countryId?: number, language?: string) =>
    ['cities-api', countryId, language] as const,
};

/**
 * Hook to fetch paginated tours with filters
 */
export function useTours(
  filters: TourFilters = {},
  pagination: PaginationParams = {},
  options?: {
    initialData?: any;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: tourKeys.list(filters, pagination),
    queryFn: () => fetchTours(filters, pagination),
    // Don't use keepPreviousData - it causes stale data to show when filters change
    // Instead, show loading state when filters change
    placeholderData: undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    initialData: options?.initialData,
    enabled: options?.enabled !== false, // Default to true if not specified
    // Always refetch when query key changes (filters or pagination)
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch a single tour by ID
 */
export function useTour(
  tourId: string,
  language: string = 'en',
  options?: {
    initialData?: any;
  }
) {
  return useQuery<Tour | null>({
    queryKey: tourKeys.detail(tourId, language),
    queryFn: () => fetchTourById(tourId, language),
    enabled: !!tourId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    initialData: options?.initialData,
  });
}

/**
 * Hook to fetch a single tour by external ID
 */
export function useTourByExternalId(externalId: number, language: string = 'en') {
  return useQuery({
    queryKey: tourKeys.detailByExternalId(externalId),
    queryFn: () => fetchTourByExternalId(externalId, language),
    enabled: !!externalId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch countries for filters
 */
export function useCountries(language: string = 'en') {
  return useQuery<CountryWithTranslations[]>({
    queryKey: tourKeys.countriesWithLang(language),
    queryFn: () => fetchCountries(language),
    staleTime: 30 * 60 * 1000, // 30 minutes - countries don't change often
  });
}

/**
 * Hook to fetch cities for filters
 */
export function useCities(countryId?: number, language: string = 'en') {
  return useQuery({
    queryKey: tourKeys.citiesWithFilters(countryId, language),
    queryFn: () => fetchCities(countryId, language),
    enabled: countryId === undefined || countryId > 0, // Allow fetching all cities or by country
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch cities from FreeTour API by country
 */
export function useCitiesFromAPI(countryId: number | undefined, language: string = 'en') {
  return useQuery({
    queryKey: tourKeys.citiesFromAPI(countryId, language),
    queryFn: () => fetchCitiesFromAPI(countryId!, language),
    enabled: !!countryId && countryId > 0, // Only fetch when country is selected
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch tours metadata
 */
export function useToursMetadata() {
  return useQuery({
    queryKey: tourKeys.metadata(),
    queryFn: fetchToursMetadata,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Mutation hook to sync tours from API
 */
export function useSyncTours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (maxPages?: number) => syncTours(maxPages),
    onSuccess: () => {
      // Invalidate all tour-related queries after successful sync
      queryClient.invalidateQueries({ queryKey: tourKeys.all });
      queryClient.invalidateQueries({ queryKey: tourKeys.countries() });
      queryClient.invalidateQueries({ queryKey: tourKeys.cities() });
    },
  });
}

/**
 * Hook to prefetch next page of tours
 */
export function usePrefetchToursNextPage(
  filters: TourFilters,
  currentPage: number,
  totalPages: number,
  pagination: PaginationParams
) {
  const queryClient = useQueryClient();

  const prefetchNextPage = () => {
    if (currentPage < totalPages) {
      const nextPagePagination = { ...pagination, page: currentPage + 1 };
      queryClient.prefetchQuery({
        queryKey: tourKeys.list(filters, nextPagePagination),
        queryFn: () => fetchTours(filters, nextPagePagination),
        staleTime: 5 * 60 * 1000,
      });
    }
  };

  return { prefetchNextPage };
}

