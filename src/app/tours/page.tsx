import { ToursPageClient } from '@/components/tours/ToursPageClient';
import { SiteFooter } from '@/components/home/v2';
import { siteFooterFromEnv } from '@/layout/lib/site-footer';
import { fetchTours, fetchCountries, fetchToursMetadata } from '@/actions/tours';
import { getRouteLanguage } from '@/i18n/server';
import { hubLocaleMetadata } from '@/i18n/metadata';
import type { TourFilters } from '@/lib/db/repositories/tour-repository';
import type { PaginationParams } from '@/lib/db/pagination';
import { parseSort, sortToPagination } from '@/tours/lib/sort';
import { parseExtraFilters } from '@/tours/lib/extra-filters';
import { parseDurationRange } from '@/tours/lib/duration';
import { loadFx, loadTripCards } from '@/trips/public-load';
import { toursTrips } from '@/trips/lib/public';
import { getPrisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import { taxonomyFiltersEnabled, toursRobots } from '@/taxonomy/lib/filters';
import { catalogName, catalogTitle } from '@/tours/lib/catalog-name';
import { JsonLd } from '@/components/destinations/JsonLd';
import { toursItemList } from '@/seo/lib/listing-ld';
import { canonicalHrefs } from '@/seo/lib/itemlist';
import { getDestinations, primeraPiezaOn, siteUrl } from '@/destinations/server';
import { transformDBToursToUITours } from '@/lib/db/tour-transformer';
import type { TourWithRelations } from '@/lib/db/repositories/tour-repository';

const taxonomyOn = () => taxonomyFiltersEnabled(process.env as Record<string, string | undefined>);
const toQuery = (params: Record<string, string | undefined>) =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => typeof v === 'string') as [string, string][]);

// REQ-174 (sitelinks-google): title = nombre del menú + marca («Experiencias | Travel Puzzle»).
/** T4 (REQ-413): con un filtro de la taxonomía, noindex,follow y canonical a /tours; sin él (o apagada), nada cambia. */
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const title = catalogTitle(await getRouteLanguage());
  const r = toursRobots(toQuery(await searchParams), taxonomyOn());
  // REQ-660 REQ-661 REQ-670 (Gate 3): con LOCALE_URLS_ENABLED, canonical del idioma y hreflang; con filtro, noindex y sin hreflang.
  const loc = await hubLocaleMetadata('/tours', { filtered: !!r.robots });
  if (loc) return { title: { absolute: title }, ...loc.meta, openGraph: { title, ...loc.meta.openGraph } };
  return { title: { absolute: title }, openGraph: { title }, ...(r.robots ? { robots: r.robots, alternates: { canonical: r.canonical } } : {}) };
}

interface ToursPageProps {
  searchParams: Promise<{
    countryId?: string;
    cityId?: string;
    minPrice?: string;
    maxPrice?: string;
    search?: string;
    page?: string;
    sort?: string;
    duracion?: string;
    [k: string]: string | undefined;
  }>;
}

export default async function ToursPage({ searchParams }: ToursPageProps) {
  // Get language from cookies, default to 'en'
  const language = await getRouteLanguage();
  
  // Parse URL search params
  const params = await searchParams;
  
  // REQ-049..056: "hoy" se calcula en el servidor (render determinista, INC-001)
  const today = new Date().toISOString().slice(0, 10);
  const taxonomy = taxonomyOn();
  const extra = parseExtraFilters(toQuery(params), today, { taxonomy });
  // Build filters from URL params
  const filters: TourFilters = {
    language,
    countryId: params.countryId ? parseInt(params.countryId, 10) : undefined,
    cityId: params.cityId ? parseInt(params.cityId, 10) : undefined,
    minPrice: params.minPrice ? parseFloat(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : undefined,
    durationRange: parseDurationRange(params.duracion),
    ...extra,
    taxonomy,
  };
  
  // Build pagination from URL params
  const pagination: PaginationParams = {
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: 20,
    ...sortToPagination(parseSort(params.sort, !!params.search)),
    ...(params.search && {
      searchValue: params.search,
      searchBy: ['title', 'brief', 'description'],
    }),
  };

  // Fetch initial data in parallel
  const [toursData, countriesData, metadata, ownTrips, fx] = await Promise.all([
    // Fetch tours with filters from URL params (or defaults)
    fetchTours(filters, pagination),
    // Fetch countries for filters
    fetchCountries(language),
    // Fetch metadata
    fetchToursMetadata(),
    // Viajes propios y de agencias (vacío con OWN_TOURS_ENABLED apagado).
    // REQ-172: el transporte no es un tour; se lista en /traslados, no aquí (ni chips, ni conteos, ni buscador).
    loadTripCards(language).then(toursTrips),
    // REQ-1254: tipo de cambio del día para el rango de precio (si falla, el rango solo dice EUR).
    loadFx().catch(() => null),
  ]);
  const countryCodeById: Record<number, string> = ownTrips.length
    ? Object.fromEntries((await getPrisma().country.findMany({ select: { id: true, code: true } })).map((c) => [c.id, c.code.toUpperCase()]))
    : {};

  // Format lastUpdated date on server to avoid hydration mismatch
  const localeMap: Record<string, string> = {
    en: 'en-US',
    es: 'es-ES',
    pt: 'pt-PT',
    de: 'de-DE',
    fr: 'fr-FR',
    it: 'it-IT',
  };
  const formattedLastUpdated = metadata.lastUpdated
    ? new Date(metadata.lastUpdated).toLocaleDateString(localeMap[language] || 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    : null;

  // REQ-582: ItemList de lo que lista la página (tours de esta página y viajes), con la URL canónica final.
  const resolve = primeraPiezaOn() ? canonicalHrefs(await getDestinations().catch(() => null)) : undefined;
  const pageTours = transformDBToursToUITours(((toursData as { data?: unknown[] } | null)?.data ?? []) as TourWithRelations[], language);
  const list = toursItemList({ siteUrl: siteUrl(), name: catalogName(language), tours: pageTours, trips: ownTrips, resolve });

  return (
    <>
    {list && <JsonLd data={[list]} />}
    <ToursPageClient
      initialToursData={toursData}
      initialCountriesData={countriesData}
      initialMetadata={{
        ...metadata,
        lastUpdatedFormatted: formattedLastUpdated,
      }}
      initialLanguage={language}
      ownTrips={ownTrips}
      countryCodeById={countryCodeById}
      today={today}
      showDepartures={process.env.DEPARTURE_FILTERS_ENABLED === 'true'}
      taxonomy={taxonomy}
      showSuggest={process.env.SEARCH_SUGGEST_ENABLED === 'true'}
      mxnPerEur={fx?.EUR ?? null}
      logSearches={process.env.SEARCH_LOG_ENABLED === 'true'}
    />
    {/* REQ-1100 (D07): el mismo pie del home que el resto del sitio. */}
    <SiteFooter {...siteFooterFromEnv(process.env as Record<string, string | undefined>)} />
    </>
  );
}
