import { ToursPageClient } from '@/components/tours/ToursPageClient';
import { fetchTours, fetchCountries, fetchToursMetadata } from '@/actions/tours';
import { getPreferredLanguage } from '@/lib/utils/cookies';
import type { TourFilters } from '@/lib/db/repositories/tour-repository';
import type { PaginationParams } from '@/lib/db/pagination';
import { parseSort, sortToPagination } from '@/tours/lib/sort';
import { parseExtraFilters } from '@/tours/lib/extra-filters';
import { parseDurationRange } from '@/tours/lib/duration';
import { loadTripCards } from '@/trips/public-load';
import { toursTrips } from '@/trips/lib/public';
import { getPrisma } from '@/lib/prisma';

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
  const language = await getPreferredLanguage();
  
  // Parse URL search params
  const params = await searchParams;
  
  // REQ-049..056: "hoy" se calcula en el servidor (render determinista, INC-001)
  const today = new Date().toISOString().slice(0, 10);
  const extra = parseExtraFilters(new URLSearchParams(Object.entries(params).filter(([, v]) => typeof v === 'string') as [string, string][]), today);
  // Build filters from URL params
  const filters: TourFilters = {
    language,
    countryId: params.countryId ? parseInt(params.countryId, 10) : undefined,
    cityId: params.cityId ? parseInt(params.cityId, 10) : undefined,
    minPrice: params.minPrice ? parseFloat(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : undefined,
    durationRange: parseDurationRange(params.duracion),
    ...extra,
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
  const [toursData, countriesData, metadata, ownTrips] = await Promise.all([
    // Fetch tours with filters from URL params (or defaults)
    fetchTours(filters, pagination),
    // Fetch countries for filters
    fetchCountries(language),
    // Fetch metadata
    fetchToursMetadata(),
    // Viajes propios y de agencias (vacío con OWN_TOURS_ENABLED apagado).
    // REQ-172: el transporte no es un tour; se lista en /traslados, no aquí (ni chips, ni conteos, ni buscador).
    loadTripCards(language).then(toursTrips),
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

  return (
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
    />
  );
}
