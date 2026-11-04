'use client';
import { SectionBoundary } from '@/components/common/SectionBoundary';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { Navbar } from '@/components/layout/Navbar';
import { TourCard } from '@/components/tours/TourCard';
import { OwnTripsInTours, ToursKindChips } from '@/components/trips/OwnTripsInTours';
import type { TripCard } from '@/trips/public-load';
import { isOwnKindFilter, type ToursKindFilter } from '@/trips/lib/public';
import { TourFiltersPanel } from '@/components/tours/TourFiltersPanel';
import { TourGridSkeleton } from '@/components/tours/TourGridSkeleton';
import { ToursHeader } from '@/components/tours/ToursHeader';
import { MobileFiltersToggle } from '@/components/tours/MobileFiltersToggle';
import { DurationFilter } from '@/components/tours/DurationFilter';
import { ToursMap } from '@/components/tours/ToursMap';
import { ViewToggle, type ToursView } from '@/components/tours/ViewToggle';
import { parseDurationRange, type DurationRange } from '@/tours/lib/duration';
import { toursToPins } from '@/tours/lib/map-pins';
import { parseSort, sortToPagination, type TourSort } from '@/tours/lib/sort';
import { useTours, useCitiesFromAPI, useTourHighlights } from '@/lib/queries/tours';
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
    /** Viajes propios y de agencias publicados (vacío si OWN_TOURS_ENABLED está apagado). */
    ownTrips?: TripCard[];
    /** id de país del catálogo → código ISO, para filtrar los viajes por país. */
    countryCodeById?: Record<number, string>;
}

export function ToursPageClient({
    initialToursData,
    initialCountriesData,
    initialMetadata,
    initialLanguage,
    ownTrips = [],
    countryCodeById = {},
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
    // Tipo (gate L): todo, free tours o viajes propios/de agencias por tipo. Va en la URL como ?tipo=.
    const [kind, setKind] = useState<ToursKindFilter>(() => {
        const k = searchParams.get('tipo');
        return k === 'free' || (k && isOwnKindFilter(k)) ? (k as ToursKindFilter) : 'all';
    });
    const changeKind = (k: ToursKindFilter) => {
        setKind(k);
        const q = new URLSearchParams(searchParams.toString());
        if (k === 'all') q.delete('tipo'); else q.set('tipo', k);
        router.replace(`${pathname}${q.toString() ? `?${q}` : ''}`, { scroll: false });
    };
    const [uiFilters, setUiFilters] = useState<UITourFilters>(() => {
        const { filters } = parseUrlParams();
        return filters;
    });
    const [pagination, setPagination] = useState<PaginationParams>(() => {
        const { pagination: pag } = parseUrlParams();
        return pag;
    });

    // Orden (?sort=…); por defecto, los que tienen más reseñas
    const [sort, setSort] = useState<TourSort>(() => parseSort(searchParams.get('sort')));
    const [filtersOpen, setFiltersOpen] = useState(false);
    // Duración (?duracion=short|mid|long)
    const [duration, setDuration] = useState<DurationRange | null>(() => parseDurationRange(searchParams.get('duracion')));
    // Lista o mapa (celular y tablet) y tour resaltado en el mapa
    const [view, setView] = useState<ToursView>('list');
    const [activeId, setActiveId] = useState<string | null>(null);

    // Convert UI filters to repository filters
    const repositoryFilters: RepositoryTourFilters = {
        language,
        countryId: uiFilters.countryId,
        cityId: uiFilters.cityId,
        minPrice: uiFilters.minPrice,
        maxPrice: uiFilters.maxPrice,
        durationRange: duration,
    };

    // Build pagination with search if provided
    const paginationWithSearch: PaginationParams = {
        ...pagination,
        ...sortToPagination(sort),
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
        sort === parseSort(searchParams.get('sort')) &&
        duration === parseDurationRange(searchParams.get('duracion')) &&
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
    // Frases de reseñas reales de 5 ★ para las tarjetas (llegan después de la lista; si no hay, se ve la descripción).
    const { data: highlights } = useTourHighlights(tours.map((x) => x.externalId), language);
    const countries = initialCountriesData.map(country =>
        transformCountryForFilter(country, language)
    );
    const cities = citiesData || []; // API already returns in correct format

    // Pines del mapa: los tours de esta página con punto de encuentro válido
    const pins = useMemo(() => {
        const rows = currentToursData?.data ?? [];
        return toursToPins(tours.map((x) => ({
            id: x.id,
            externalId: x.externalId,
            title: x.title,
            image: x.images.find((img) => img && img.trim() !== '') ?? null,
            price: x.price,
            currency: x.currency,
            meetingPoint: rows.find((r: { id: string }) => r.id === x.id)?.meetingPoint ?? null,
        })));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentToursData, language]);

    const sortRef = useRef<TourSort>(sort);
    sortRef.current = sort;
    const durationRef = useRef<DurationRange | null>(duration);
    durationRef.current = duration;

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
            if (sortRef.current !== 'reviews') params.set('sort', sortRef.current);
            if (durationRef.current) params.set('duracion', durationRef.current);

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
    }, [uiFilters, pagination, sort, duration, updateUrlParams]);

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

    const handleDurationChange = (next: DurationRange | null) => {
        setDuration(next);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleSortChange = (next: TourSort) => {
        setSort(next);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const activeFilters = [uiFilters.countryId, uiFilters.cityId, uiFilters.minPrice, uiFilters.maxPrice, duration ?? undefined].filter((v) => v !== undefined).length;

    const handlePaginationChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const pageInfo = currentToursData?.pagination;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="tp-dark min-h-screen pb-24">
                <ToursHeader
                    total={pageInfo?.total || 0}
                    lastUpdated={initialMetadata?.lastUpdatedFormatted ?? undefined}
                    search={uiFilters.search || ''}
                    onSearch={(value) => handleFilterChange({ search: value || undefined })}
                    sort={sort}
                    onSort={handleSortChange}
                />

                <div id="tours-results" className="mx-auto grid max-w-[1600px] scroll-mt-20 grid-cols-1 gap-6 px-4 pt-8 md:px-8 lg:grid-cols-4 xl:grid-cols-12">
                    {/* Filtros */}
                    <aside className="lg:col-span-1 xl:col-span-3">
                        <MobileFiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen((v) => !v)} active={activeFilters} />
                        <div className={`${filtersOpen ? 'mt-3 block' : 'hidden'} lg:sticky lg:top-6 lg:mt-0 lg:block`}>
                            <TourFiltersPanel
                                filters={uiFilters}
                                onFilterChange={handleFilterChange}
                                countries={countries}
                                cities={cities}
                                isLoadingCities={isLoadingCities}
                                hideSearch
                            />
                            <DurationFilter value={duration} onChange={handleDurationChange} />
                        </div>
                    </aside>

                    {/* Tours (en celular y tablet se oculta cuando se ve el mapa) */}
                    <div className={`lg:col-span-3 xl:col-span-5 ${view === 'map' ? 'hidden xl:block' : ''}`}>
                        {ownTrips.length > 0 && <ToursKindChips value={kind} onChange={changeKind} lang={language} kinds={ownTrips.map((t) => t.kind)} />}
                        {ownTrips.length > 0 && (pagination.page ?? 1) === 1 && (
                            <SectionBoundary name="viajes-en-tours"><OwnTripsInTours trips={ownTrips} kind={kind} lang={language} countryCode={uiFilters.countryId ? countryCodeById[uiFilters.countryId] ?? null : null} /></SectionBoundary>
                        )}
                        {isOwnKindFilter(kind) ? null : isLoadingTours ? (
                            <TourGridSkeleton count={6} />
                        ) : tours.length === 0 ? (
                            <div className="rounded-2xl border border-white/10 bg-[#121D45] px-6 py-14 text-center">
                                <p className="font-display text-2xl font-semibold text-white">{t('tours.noResults')}</p>
                                <p className="mt-2 text-[#A9B6D6]">{t('tours.noResultsHelp', "Try another city or message us on WhatsApp and we'll help.")}</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-2">
                                    {tours.map(tour => (
                                        <div key={tour.id} onMouseEnter={() => setActiveId(tour.id)} onMouseLeave={() => setActiveId(null)}>
                                            <TourCard tour={tour} highlight={highlights?.[tour.externalId]?.text} />
                                        </div>
                                    ))}
                                </div>

                                {pageInfo && pageInfo.totalPages > 1 && (
                                    <nav aria-label="Paginación" className="mt-10 flex items-center justify-center gap-3">
                                        <button
                                            onClick={() => handlePaginationChange(Math.max(1, (pagination.page || 1) - 1))}
                                            disabled={pagination.page === 1}
                                            className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white hover:border-[#008DFF] disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            ← {t('pagination.previous')}
                                        </button>
                                        <span className="font-data px-2 text-xs uppercase tracking-[0.2em] text-[#A9B6D6]">
                                            {t('pagination.pageOf', 'Page {current} of {total}').replace('{current}', String(pageInfo.currentPage)).replace('{total}', String(pageInfo.totalPages))}
                                        </span>
                                        <button
                                            onClick={() => handlePaginationChange((pagination.page || 1) + 1)}
                                            disabled={pagination.page === pageInfo.totalPages}
                                            className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white hover:border-[#008DFF] disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            {t('pagination.next')} →
                                        </button>
                                    </nav>
                                )}
                            </>
                        )}
                    </div>

                    {/* Mapa: columna fija en escritorio; en celular y tablet, con el botón Mapa/Lista */}
                    <div className={`${view === 'map' ? 'block' : 'hidden'} lg:col-span-3 lg:col-start-2 xl:col-span-4 xl:col-start-auto xl:block`}>
                        <div className="h-[calc(100vh-180px)] xl:sticky xl:top-24 xl:h-[calc(100vh-112px)]">
                            <ToursMap pins={pins} activeId={activeId} />
                        </div>
                    </div>
                </div>
                <ViewToggle
                    view={view}
                    onChange={(v) => {
                        setView(v);
                        requestAnimationFrame(() => document.getElementById('tours-results')?.scrollIntoView({ behavior: 'smooth' }));
                    }}
                />
            </main>
        </div>
    );
}
