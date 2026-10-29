import { ToursPageClient } from '@/components/tours/ToursPageClient';
import { fetchTours, fetchCountries, fetchToursMetadata } from '@/actions/tours';
import { getPreferredLanguage } from '@/lib/utils/cookies';
import type { TourFilters } from '@/lib/db/repositories/tour-repository';
import type { PaginationParams } from '@/lib/db/pagination';

interface ToursPageProps {
  searchParams: Promise<{
    countryId?: string;
    cityId?: string;
    minPrice?: string;
    maxPrice?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function ToursPage({ searchParams }: ToursPageProps) {
  // Get language from cookies, default to 'en'
  const language = await getPreferredLanguage();
  
  // Parse URL search params
  const params = await searchParams;
  
  // Build filters from URL params
  const filters: TourFilters = {
    language,
    countryId: params.countryId ? parseInt(params.countryId, 10) : undefined,
    cityId: params.cityId ? parseInt(params.cityId, 10) : undefined,
    minPrice: params.minPrice ? parseFloat(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : undefined,
  };
  
  // Build pagination from URL params
  const pagination: PaginationParams = {
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: 20,
    ...(params.search && {
      searchValue: params.search,
      searchBy: ['title', 'brief', 'description'],
    }),
  };

  // Fetch initial data in parallel
  const [toursData, countriesData, metadata] = await Promise.all([
    // Fetch tours with filters from URL params (or defaults)
    fetchTours(filters, pagination),
    // Fetch countries for filters
    fetchCountries(language),
    // Fetch metadata
    fetchToursMetadata(),
  ]);

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
    />
  );
}
