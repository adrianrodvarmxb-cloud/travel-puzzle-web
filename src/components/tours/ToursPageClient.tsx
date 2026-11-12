'use client';
import { SectionBoundary } from '@/components/common/SectionBoundary';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useLocalizedHref } from '@/components/i18n/useLocalizedHref';
import { useLanguage } from '@/lib/language-context';
import { Navbar } from '@/components/layout/Navbar';
import { ExperienceCard } from '@/components/tours/ExperienceCard';
import { fromCatalogTour } from '@/tours/lib/card-sources';
import { OwnTripsInTours, ToursKindChips } from '@/components/trips/OwnTripsInTours';
import { FormatChips } from '@/components/tours/FormatChips';
import { formatChips } from '@/tours/lib/format-chips';
import type { FormatDef } from '@/taxonomy/lib/format-defs';
import type { TripCard } from '@/trips/public-load';
import { isOwnKindFilter, isToursKindFilter, type ToursKindFilter } from '@/trips/lib/public';
import { TourFiltersPanel } from '@/components/tours/TourFiltersPanel';
import { TourGridSkeleton } from '@/components/tours/TourGridSkeleton';
import { ToursHeader } from '@/components/tours/ToursHeader';
import { SearchNote, SearchRecovery } from '@/components/search/SearchRecovery';
import { useSearchLog } from '@/components/search/useSearchLog';
import { MobileFiltersToggle } from '@/components/tours/MobileFiltersToggle';
import { DurationFilter } from '@/components/tours/DurationFilter';
import { MoreFilters } from '@/components/tours/filters/MoreFilters';
import { FiltersSheet } from '@/components/tours/filters/FiltersSheet';
import { matchesToursFilter } from '@/trips/lib/public';
import { experienciasDisponibles } from '@/tours/lib/available';
import { parseExtraFilters, extraFiltersToParams, countActive, EMPTY_EXTRA, type ExtraFilters } from '@/tours/lib/extra-filters';
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
    /** Fecha de hoy (YYYY-MM-DD) calculada en el servidor. */
    today: string;
    /** REQ-061: mostrar filtros de idioma y fecha (DEPARTURE_FILTERS_ENABLED). */
    showDepartures?: boolean;
    /** T4 (TAXONOMY_FILTERS_ENABLED): filtro «Tipo de experiencia» por formato en lugar de los grupos viejos. */
    taxonomy?: boolean;
    /** REQ-1256: tipos principales del diccionario (servidor); con ellos, chips y filtro se actualizan solos. */
    formatDefs?: FormatDef[];
    /** REQ-290…292: autocompletado y cero resultados con salida (SEARCH_SUGGEST_ENABLED). */
    showSuggest?: boolean;
    /** REQ-1254: MXN por EUR del día (servidor), para el rango de precio aproximado. */
    mxnPerEur?: number | null;
    /** REQ-340…342: analítica anónima de búsquedas (SEARCH_LOG_ENABLED). */
    logSearches?: boolean;
}

export function ToursPageClient({
    initialToursData,
    initialCountriesData,
    initialMetadata,
    initialLanguage,
    ownTrips = [],
    countryCodeById = {},
    today,
    showDepartures = false,
    formatDefs,
    mxnPerEur = null,
    taxonomy = false,
    showSuggest = false,
    logSearches = false,
}: ToursPageClientProps) {
    const { t, language } = useLanguage();
    const router = useRouter();
    const pathname = usePathname();
    const localize = useLocalizedHref();
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
        // REQ-172: ?tipo=transporte ya no es un filtro de /tours (el middleware lo manda a /traslados).
        return k === 'free' || (k && isToursKindFilter(k)) ? (k as ToursKindFilter) : 'all';
    });
    const changeKind = (k: ToursKindFilter) => {
        setKind(k);
        const q = new URLSearchParams(searchParams.toString());
        if (k === 'all') q.delete('tipo'); else q.set('tipo', k);
        router.replace(localize(`${pathname}${q.toString() ? `?${q}` : ''}`), { scroll: false }); // REQ-655
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
    const [sort, setSort] = useState<TourSort>(() => parseSort(searchParams.get('sort'), !!searchParams.get('search')));
    // REQ-048: al buscar sin un orden elegido se ordena por relevancia; al quitar la búsqueda vuelve a "más reseñas".
    const searching = !!uiFilters.search;
    useEffect(() => {
        setSort((s) => (searching ? (s === 'reviews' && !searchParams.get('sort') ? 'relevance' : s) : (s === 'relevance' ? 'reviews' : s)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searching]);
    const [filtersOpen, setFiltersOpen] = useState(false);
    // Duración (?duracion=short|mid|long)
    const [duration, setDuration] = useState<DurationRange | null>(() => parseDurationRange(searchParams.get('duracion')));
    // REQ-049..056: filtros estilo Civitatis en un solo estado; "hoy" llega del servidor (render determinista)
    const [extra, setExtra] = useState<ExtraFilters>(() => parseExtraFilters(new URLSearchParams(searchParams.toString()), today, { taxonomy }));
    const extraKey = extraFiltersToParams(extra).toString();
    const changeExtra = (next: ExtraFilters) => { setExtra(next); setPagination((p) => ({ ...p, page: 1 })); };
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
        ...extra,
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
        sort === parseSort(searchParams.get('sort'), !!searchParams.get('search')) &&
        duration === parseDurationRange(searchParams.get('duracion')) &&
        extraKey === extraFiltersToParams(parseExtraFilters(new URLSearchParams(searchParams.toString()), today, { taxonomy })).toString() &&
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
    const extraRef = useRef(extra);
    extraRef.current = extra;

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
            if (sortRef.current !== 'reviews' && sortRef.current !== 'relevance') params.set('sort', sortRef.current); // REQ-048: relevancia es el defecto al buscar
            if (durationRef.current) params.set('duracion', durationRef.current);
            extraFiltersToParams(extraRef.current, params);

            // Add pagination params (only if not page 1)
            if (pagination.page && pagination.page > 1) {
                params.set('page', pagination.page.toString());
            }

            // Update URL without causing a page reload
            const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
            router.replace(localize(newUrl), { scroll: false }); // REQ-655: con rewrite, pathname puede venir sin prefijo
        },
        [pathname, router, localize]
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
    }, [uiFilters, pagination, sort, duration, extraKey, updateUrlParams]);

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

    // REQ-292: búsqueda original cuando la alternativa única se aplicó sola («no había resultados para…»)
    const [recoveredFrom, setRecoveredFrom] = useState<string | null>(null);
    const handleFilterChange = (newFilters: Partial<UITourFilters>) => {
        if ('search' in newFilters) setRecoveredFrom(null);
        setUiFilters(prev => ({ ...prev, ...newFilters }));
        // Reset to page 1 when filters change
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const applyRecovery = useCallback((alt: string, from: string) => {
        setUiFilters(prev => ({ ...prev, search: alt }));
        setPagination(prev => ({ ...prev, page: 1 }));
        setRecoveredFrom(from);
    }, []);

    const handleDurationChange = (next: DurationRange | null) => {
        setDuration(next);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleSortChange = (next: TourSort) => {
        setSort(next);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    // REQ-056: viajes propios que coinciden (para el conteo del botón "Ver N actividades")
    // T4 (REQ-412): conteos por formato = catálogo (del servidor) + viajes propios con los mismos filtros salvo el formato.
    const formatCounts: Record<string, number> | null = taxonomy ? { ...((currentToursData as { facets?: { formato: Record<string, number> } } | undefined)?.facets?.formato ?? {}) } : null;
    // REQ-1421 / REQ-1422: conteos de tema y atributo del servidor (los viajes propios no suman: aún no los traen).
    const facets = (currentToursData as { facets?: { tema?: Record<string, number>; atrib?: Record<string, number> } } | undefined)?.facets;
    const temaCounts = taxonomy ? facets?.tema ?? {} : null;
    const atribCounts = taxonomy ? facets?.atrib ?? {} : null;
    if (formatCounts) for (const trip of ownTrips.filter((x) => matchesToursFilter(x, { countryCode: uiFilters.countryId ? countryCodeById[uiFilters.countryId] ?? null : null, kind: 'all', search: uiFilters.search, cityName: uiFilters.cityId ? cities.find((c) => c.id === uiFilters.cityId)?.name ?? null : null, minPrice: uiFilters.minPrice, maxPrice: uiFilters.maxPrice, ...extra, formatos: [] }))) {
        if (trip.formato) formatCounts[trip.formato] = (formatCounts[trip.formato] ?? 0) + 1;
    }
    // REQ-1346 (INC-008): viajes que coinciden con los filtros en cualquier página; el encabezado suma catálogo + viajes
    // (el mismo total que el inicio y que la suma del filtro).
    const ownMatches = ownTrips.filter((t) => matchesToursFilter(t, { countryCode: uiFilters.countryId ? countryCodeById[uiFilters.countryId] ?? null : null, kind: taxonomy ? "all" : kind, search: uiFilters.search, cityName: uiFilters.cityId ? cities.find((x) => x.id === uiFilters.cityId)?.name ?? null : null, minPrice: uiFilters.minPrice, maxPrice: uiFilters.maxPrice, ...extra }));
    const ownCount = (pagination.page ?? 1) === 1 ? ownTrips.filter((t) => matchesToursFilter(t, { countryCode: uiFilters.countryId ? countryCodeById[uiFilters.countryId] ?? null : null, kind: taxonomy ? "all" : kind, search: uiFilters.search, cityName: uiFilters.cityId ? cities.find((x) => x.id === uiFilters.cityId)?.name ?? null : null, minPrice: uiFilters.minPrice, maxPrice: uiFilters.maxPrice, ...extra })).length : 0;
    const clearAllFilters = () => {
        setUiFilters((prev) => ({ search: prev.search }));
        setDuration(null);
        setExtra(EMPTY_EXTRA);
        setPagination((p) => ({ ...p, page: 1 }));
    };
    const activeFilters = [uiFilters.countryId, uiFilters.cityId, uiFilters.minPrice, uiFilters.maxPrice, duration ?? undefined].filter((v) => v !== undefined).length + countActive(extra);

    const handlePaginationChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const pageInfo = currentToursData?.pagination;
    // REQ-340/342: una búsqueda y sus clics, sin datos personales (apagado: no manda nada)
    const logClick = useSearchLog(logSearches, uiFilters.search, language, pageInfo?.total, isLoadingTours);
    // REQ-170 / REQ-522: etiquetas de precio y formato armadas en el servidor (fetchTours).
    const cardExtras = currentToursData as { priceLabels?: Record<string, { main: string; approx: string | null }>; cardFormats?: Record<string, string>; cardHrefs?: Record<string, string> } | undefined;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="tp-dark min-h-screen pb-24">
                <ToursHeader
                    total={experienciasDisponibles(pageInfo?.total || 0, ownMatches)}
                    lastUpdated={initialMetadata?.lastUpdatedFormatted ?? undefined}
                    search={uiFilters.search || ''}
                    onSearch={(value) => handleFilterChange({ search: value || undefined })}
                    sort={sort}
                    onSort={handleSortChange}
                    suggest={showSuggest}
                />

                <div id="tours-results" className="mx-auto grid max-w-[1600px] scroll-mt-20 grid-cols-1 gap-6 px-4 pt-8 md:px-8 lg:grid-cols-4 xl:grid-cols-12">
                    {/* Filtros */}
                    <aside className="lg:col-span-1 xl:col-span-3">
                        <MobileFiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen((v) => !v)} active={activeFilters} />
                        <FiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} onClear={clearAllFilters} count={(currentToursData?.pagination?.total ?? 0) + ownCount} lang={language}>
                            <TourFiltersPanel
                                filters={uiFilters}
                                onFilterChange={handleFilterChange}
                                countries={countries}
                                cities={cities}
                                isLoadingCities={isLoadingCities}
                                hideSearch
                                hidePrice
                            />
                            {false && <DurationFilter value={duration} onChange={handleDurationChange} /> /* REQ-056: reemplazado por el deslizador de duración */}
                            <MoreFilters formatDefs={formatDefs} mxnPerEur={mxnPerEur} showDepartures={showDepartures} taxonomy={taxonomy} formatCounts={formatCounts} temaCounts={temaCounts} atribCounts={atribCounts} value={extra} onChange={changeExtra} today={today} lang={language} priceLabel={t('tours.filters.priceRange')} price={{ min: uiFilters.minPrice, max: uiFilters.maxPrice }} onPrice={(minPrice, maxPrice) => handleFilterChange({ minPrice, maxPrice })} />
                        </FiltersSheet>
                    </aside>

                    {/* Tours (en celular y tablet se oculta cuando se ve el mapa) */}
                    <div className={`lg:col-span-3 xl:col-span-5 ${view === 'map' ? 'hidden xl:block' : ''}`}>
                        {/* REQ-546…549: con TAXONOMY_FILTERS_ENABLED, los chips son los tipos principales (mismas etiquetas que la
                            tarjeta, desde los datos) y filtran con ?formato=; sin ella quedan los chips viejos por Trip.kind (ocultos, no borrados). */}
                        {taxonomy
                            ? <FormatChips chips={formatChips(formatCounts, language, formatDefs)} value={extra.formatos.length === 1 ? extra.formatos[0] : null} onChange={(slug) => changeExtra({ ...extra, formatos: slug ? [slug] : [] })} />
                            : ownTrips.length > 0 && <ToursKindChips value={kind} onChange={changeKind} lang={language} kinds={ownTrips.map((t) => t.kind)} />}
                        {ownTrips.length > 0 && (pagination.page ?? 1) === 1 && (
                            <SectionBoundary name="viajes-en-tours"><OwnTripsInTours trips={ownTrips} kind={taxonomy ? 'all' : kind} lang={language} countryCode={uiFilters.countryId ? countryCodeById[uiFilters.countryId] ?? null : null} search={uiFilters.search} extra={extra} cityName={uiFilters.cityId ? cities.find((x) => x.id === uiFilters.cityId)?.name ?? null : null} minPrice={uiFilters.minPrice} maxPrice={uiFilters.maxPrice} /></SectionBoundary>
                        )}
                        {!taxonomy && isOwnKindFilter(kind) ? null : isLoadingTours ? (
                            <TourGridSkeleton count={6} />
                        ) : tours.length === 0 && showSuggest && uiFilters.search ? (
                            <SectionBoundary name="busqueda-sin-resultados">
                                <SearchRecovery q={uiFilters.search} language={language} onApply={applyRecovery} />
                            </SectionBoundary>
                        ) : tours.length === 0 ? (
                            <div className="rounded-2xl border border-white/10 bg-[#121D45] px-6 py-14 text-center">
                                <p className="font-display text-2xl font-semibold text-white">{t('tours.noResults')}</p>
                                <p className="mt-2 text-[#A9B6D6]">{t('tours.noResultsHelp', "Try another city or message us on WhatsApp and we'll help.")}</p>
                            </div>
                        ) : (
                            <>
                                {showSuggest && uiFilters.search && (
                                    <SectionBoundary name="busqueda-nota"><SearchNote q={uiFilters.search} language={language} recoveredFrom={recoveredFrom} /></SectionBoundary>
                                )}
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-2">
                                    {tours.map((tour, i) => (
                                        <div key={tour.id} onMouseEnter={() => setActiveId(tour.id)} onMouseLeave={() => setActiveId(null)}
                                            onClickCapture={logSearches ? () => logClick(((pagination.page ?? 1) - 1) * (pageInfo?.perPage ?? 20) + i + 1) : undefined}>
                                            {/* REQ-520: tarjeta única (TourCard queda sin uso, no se borra). */}
                                            <ExperienceCard card={fromCatalogTour(tour, { lang: language, highlight: highlights?.[tour.externalId]?.text, formato: cardExtras?.cardFormats?.[tour.id], priceLabel: cardExtras?.priceLabels?.[tour.id] ?? null, href: cardExtras?.cardHrefs?.[tour.id] })} priority={i < 2 && (pagination.page ?? 1) === 1 && !ownTrips.length} />
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
