'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { Navbar } from '@/components/layout/Navbar';
import { TourCard } from '@/components/tours/TourCard';
import { TourFiltersPanel } from '@/components/tours/TourFiltersPanel';
import { TourGridSkeleton } from '@/components/tours/TourGridSkeleton';
import { useTours, useCitiesFromAPI } from '@/lib/queries/tours';
import { transformDBToursToUITours, transformCountryForFilter } from '@/lib/db/tour-transformer';
import type { TourFilters as RepositoryTourFilters } from '@/lib/db/repositories/tour-repository';
import type { TourFilters as UITourFilters } from '@/lib/utils/tour-search';
import type { PaginationParams, PaginatedResponse } from '@/lib/db/pagination';
import type { TourWithRelations } from '@/lib/db/repositories/tour-repository';
import type { CountryWithTranslations } from '@/types';
import { SupportedLanguage } from '@/types';

interface ToursPageClientProps {
    initialToursData: PaginatedResponse<TourWithRelations>;
    initialCountriesData: CountryWithTranslations[];
    initialMetadata: {
        lastUpdated: string | null;
        lastUpdatedFormatted: string | null;
        totalTours: number;
        syncStatus: string;
    };
    initialLanguage: SupportedLanguage;
}

export function ToursPageClient({
    initialToursData,
    initialCountriesData,
    initialMetadata,
    initialLanguage,
}: ToursPageClientProps) {
    const { t, language } = useLanguage();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Parse filters and pagination from URL params
    const parseUrlParams = useCallback(() => {
        const filters: UITourFilters = {};
        const pagination: PaginationParams = {
            page: 1,
            limit: 20,
        };

        // Parse filters from URL
        const countryId = searchParams.get('countryId');
        const cityId = searchParams.get('cityId');
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        const search = searchParams.get('search');
        const page = searchParams.get('page');

        if (countryId) filters.countryId = parseInt(countryId, 10);
        if (cityId) filters.cityId = parseInt(cityId, 10);
        if (minPrice) filters.minPrice = parseFloat(minPrice);
        if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
        if (search) filters.search = search;
        if (page) pagination.page = parseInt(page, 10);

        return { filters, pagination };
    }, [searchParams]);

    // Initialize state from URL params (only on mount)
    const [uiFilters, setUiFilters] = useState<UITourFilters>(() => {
        const { filters } = parseUrlParams();
        return filters;
    });
    const [pagination, setPagination] = useState<PaginationParams>(() => {
        const { pagination: pag } = parseUrlParams();
        return pag;
    });

    // Convert UI filters to repository filters
    const repositoryFilters: RepositoryTourFilters = {
        language,
        countryId: uiFilters.countryId,
        cityId: uiFilters.cityId,
        minPrice: uiFilters.minPrice,
        maxPrice: uiFilters.maxPrice,
    };

    // Build pagination with search if provided
    const paginationWithSearch: PaginationParams = {
        ...pagination,
        ...(uiFilters.search && {
            searchValue: uiFilters.search,
            searchBy: ['title', 'brief', 'description'],
        }),
    };

    // Check if we should use initial data
    // The server component fetches data based on URL params, so initialData should match
    // React Query will use initialData if the query key matches (filters + pagination)
    const hasFilters =
        Object.keys(uiFilters).length > 0 || pagination.page !== 1 || !!uiFilters.search;

    // Check if current filters/pagination match what was fetched on server
    // The server component reads URL params, so if URL has params, initialData matches those params
    // We need to check if current state matches the initial server-fetched data
    const serverFilters = {
        countryId: searchParams.get('countryId') ? parseInt(searchParams.get('countryId')!, 10) : undefined,
        cityId: searchParams.get('cityId') ? parseInt(searchParams.get('cityId')!, 10) : undefined,
        minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
        maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
    };
    const serverPage = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const serverSearch = searchParams.get('search') || undefined;
    
    const matchesInitialData = 
        repositoryFilters.countryId === serverFilters.countryId &&
        repositoryFilters.cityId === serverFilters.cityId &&
        repositoryFilters.minPrice === serverFilters.minPrice &&
        repositoryFilters.maxPrice === serverFilters.maxPrice &&
        paginationWithSearch.searchValue === serverSearch &&
        paginationWithSearch.page === serverPage &&
        language === initialLanguage;

    // Fetch tours with filters and pagination
    // Only pass initialData if query key matches (no filters, page 1, same language)
    // This prevents React Query from using stale initialData when filters change
    const { data: toursData, isLoading: isLoadingTours } = useTours(
        repositoryFilters,
        paginationWithSearch,
        {
            initialData: matchesInitialData ? initialToursData : undefined,
        }
    );

    // Use fetched data (React Query will use initialData if available)
    const currentToursData = toursData;

    // Fetch cities for filters (only when country is selected)
    const { data: citiesData, isLoading: isLoadingCities } = useCitiesFromAPI(uiFilters.countryId, language);

    // Transform data for UI
    const tours = currentToursData?.data
        ? transformDBToursToUITours(currentToursData.data, language)
        : [];
    const countries = initialCountriesData.map(country =>
        transformCountryForFilter(country, language)
    );
    const cities = citiesData || []; // API already returns in correct format

    // Update URL params when filters or pagination change
    const updateUrlParams = useCallback(
        (filters: UITourFilters, pagination: PaginationParams) => {
            const params = new URLSearchParams();

            // Add filter params
            if (filters.countryId) params.set('countryId', filters.countryId.toString());
            if (filters.cityId) params.set('cityId', filters.cityId.toString());
            if (filters.minPrice !== undefined) params.set('minPrice', filters.minPrice.toString());
            if (filters.maxPrice !== undefined) params.set('maxPrice', filters.maxPrice.toString());
            if (filters.search) params.set('search', filters.search);

            // Add pagination params (only if not page 1)
            if (pagination.page && pagination.page > 1) {
                params.set('page', pagination.page.toString());
            }

            // Update URL without causing a page reload
            const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
            router.replace(newUrl, { scroll: false });
        },
        [pathname, router]
    );

    // Track if we're updating from URL (to prevent loops)
    const isUpdatingFromUrl = useRef(false);
    const isInitialMount = useRef(true);

    // Sync URL when filters or pagination change (but not on initial mount or when updating from URL)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (isUpdatingFromUrl.current) {
            return;
        }
        updateUrlParams(uiFilters, pagination);
    }, [uiFilters, pagination, updateUrlParams]);

    // Update state when URL params change (e.g., browser back/forward)
    useEffect(() => {
        const { filters: urlFilters, pagination: urlPagination } = parseUrlParams();
        
        // Only update if URL params actually changed to avoid unnecessary re-renders
        const filtersChanged = 
            urlFilters.countryId !== uiFilters.countryId ||
            urlFilters.cityId !== uiFilters.cityId ||
            urlFilters.minPrice !== uiFilters.minPrice ||
            urlFilters.maxPrice !== uiFilters.maxPrice ||
            urlFilters.search !== uiFilters.search;
        
        const paginationChanged = urlPagination.page !== pagination.page;

        if (filtersChanged || paginationChanged) {
            isUpdatingFromUrl.current = true;
            setUiFilters(urlFilters);
            setPagination(urlPagination);
            // Reset flag after state update
            setTimeout(() => {
                isUpdatingFromUrl.current = false;
            }, 0);
        }
    }, [searchParams, parseUrlParams]);

    const handleFilterChange = (newFilters: Partial<UITourFilters>) => {
        setUiFilters(prev => ({ ...prev, ...newFilters }));
        // Reset to page 1 when filters change
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePaginationChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">{t('tours.title')}</h1>
                    <p className="text-muted-foreground">
                        {currentToursData?.pagination.total || 0} {t('tours.subtitle')}
                    </p>
                    {initialMetadata?.lastUpdatedFormatted && (
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('tours.lastUpdated')}: {initialMetadata.lastUpdatedFormatted}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Filters Sidebar */}
                    <div className="lg:col-span-1">
                        <TourFiltersPanel
                            filters={uiFilters}
                            onFilterChange={handleFilterChange}
                            countries={countries}
                            cities={cities}
                            isLoadingCities={isLoadingCities}
                        />
                    </div>

                    {/* Tours Grid */}
                    <div className="lg:col-span-3">
                        {isLoadingTours ? (
                            <TourGridSkeleton count={6} />
                        ) : tours.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">{t('tours.noResults')}</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {tours.map(tour => (
                                        <TourCard key={tour.id} tour={tour} />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {currentToursData && currentToursData.pagination.totalPages > 1 && (
                                    <div className="mt-8 flex justify-center items-center gap-4">
                                        <button
                                            onClick={() =>
                                                handlePaginationChange(Math.max(1, (pagination.page || 1) - 1))
                                            }
                                            disabled={pagination.page === 1}
                                            className="px-4 py-2 border border-border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                                        >
                                            {t('pagination.previous')}
                                        </button>

                                        <span className="text-sm text-muted-foreground">
                                            Page {currentToursData.pagination.currentPage} of{' '}
                                            {currentToursData.pagination.totalPages}
                                        </span>

                                        <button
                                            onClick={() =>
                                                handlePaginationChange((pagination.page || 1) + 1)
                                            }
                                            disabled={pagination.page === currentToursData.pagination.totalPages}
                                            className="px-4 py-2 border border-border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                                        >
                                            {t('pagination.next')}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

