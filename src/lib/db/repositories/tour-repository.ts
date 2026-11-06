import { prisma } from '@/lib/prisma';
import { paginatedQuery, buildPaginationLinks, PaginationParams, PaginatedResponse } from '../pagination';
import { loadCatalog } from '@/catalog/snapshot';
import { queryCatalog, splitDestination, type CatalogEntry } from '@/catalog/lib/query';
import { rankedTourIds } from '@/search/ranked';
import { isSearchV2 } from '@/search/lib/fts-query';
import { Prisma } from '@prisma/client';
import { durationRangeWhere, type DurationRange } from '@/tours/lib/duration';
import { countriesWithCounts } from '@/tours/lib/d1-load';

export type TourWithRelations = Prisma.TourGetPayload<{
  include: {
    translations: true;
    city: true; // City now has translations as JSON field
    country: true; // Country now has translations as JSON field
  };
}>;

export interface TourFilters {
  language?: string;
  countryId?: number;
  cityId?: number;
  minPrice?: number;
  maxPrice?: number;
  categoryId?: number;
  /** Rango de duración (?duracion=). */
  durationRange?: DurationRange | null;
  /** REQ-049..056: filtros estilo Civitatis. */
  guideLanguage?: string | null; date?: string | null; groups?: string[];
  freeCancel?: boolean; privateOnly?: boolean; hotelPickup?: boolean; novelty?: boolean;
  durMin?: number | null; durMax?: number | null;
}

export async function getToursWithFilters(
  filters: TourFilters,
  pagination: PaginationParams,
  baseUrl: string = '/api/tours'
): Promise<PaginatedResponse<TourWithRelations>> {
  const language = filters.language || 'en';

  // Build where clause
  const where: Prisma.TourWhereInput = {
    isActive: true,
    ...(filters.countryId && { countryId: filters.countryId }),
    ...(filters.cityId && { cityId: filters.cityId }),
    ...(filters.categoryId && { categoryId: filters.categoryId }),
    ...(filters.minPrice && { priceValue: { gte: filters.minPrice } }),
    ...(filters.maxPrice && { priceValue: { lte: filters.maxPrice } }),
    ...(filters.durationRange && { durationMinutes: durationRangeWhere(filters.durationRange) }),
  };

  // Add search if provided
  if (pagination.searchValue && pagination.searchBy?.length) {
    const searchConditions = pagination.searchBy
      .map((field) => {
        if (field === 'title' || field === 'brief' || field === 'description') {
          return {
            translations: {
              some: {
                language,
                [field]: { contains: pagination.searchValue },
              },
            },
          };
        }
        return null;
      })
      .filter(Boolean);

    if (searchConditions.length > 0) {
      where.OR = searchConditions as Prisma.TourWhereInput[];
    }
  }

  // Include relations with language filtering
  const include = {
    translations: { where: { language } },
    city: true, // City now has translations as JSON field
    country: true, // Country now has translations as JSON field
  };

  // Order by mapping
  const orderByMapping = {
    price: (order: 'asc' | 'desc') => ({ priceValue: order }),
    rating: (order: 'asc' | 'desc') => ({ rating: order }),
    // Los tours sin duración conocida van al final.
    duration: (order: 'asc' | 'desc') => ({ durationMinutes: { sort: order, nulls: 'last' as const } }),
    reviewsNumber: (order: 'asc' | 'desc') => ({ reviewsNumber: order }),
    createdAt: (order: 'asc' | 'desc') => ({ createdAt: order }),
    updatedAt: (order: 'asc' | 'desc') => ({ updatedAt: order }),
  };

  return paginatedQuery<TourWithRelations>(
    prisma.tour,
    where,
    include,
    pagination,
    baseUrl,
    orderByMapping
  );
}

// REQ-035 (INC-003): misma respuesta que getToursWithFilters, pero filtro/orden/conteo en memoria
// sobre el índice del catálogo; D1 solo lee los tours de la página por id.
export async function getToursFromCatalog(
  filters: TourFilters,
  pagination: PaginationParams,
  baseUrl: string = '/api/tours'
): Promise<PaginatedResponse<TourWithRelations>> {
  const language = filters.language || 'en';
  // REQ-122: con SEARCH_V2_ENABLED="true", el destino dentro del texto se separa y el resto se busca dentro de él.
  // Con la bandera apagada, exactamente lo de antes (rankedTourIds devuelve null).
  const searchV2 = isSearchV2(process.env.SEARCH_V2_ENABLED);
  let entries: CatalogEntry[], ranked: string[] | null;
  if (searchV2) {
    entries = await loadCatalog(language);
    const split = splitDestination(entries, pagination.searchValue);
    ranked = split ? (split.rest ? await rankedTourIds(language, split.rest, split.name) : null) : await rankedTourIds(language, pagination.searchValue);
  } else {
    [entries, ranked] = await Promise.all([loadCatalog(language), rankedTourIds(language, pagination.searchValue)]);
  }
  const { ids, total, page, limit } = queryCatalog(entries, {
    countryId: filters.countryId, cityId: filters.cityId, categoryId: filters.categoryId,
    minPrice: filters.minPrice, maxPrice: filters.maxPrice, durationRange: filters.durationRange,
    search: pagination.searchValue,
    guideLanguage: filters.guideLanguage, date: filters.date, groups: filters.groups, freeCancel: filters.freeCancel,
    privateOnly: filters.privateOnly, hotelPickup: filters.hotelPickup, novelty: filters.novelty,
    durMin: filters.durMin, durMax: filters.durMax,
    ranked, // REQ-048: relevancia FTS5 (null = búsqueda por palabras)
    searchV2, // REQ-122
  }, pagination);
  const rows = ids.length
    ? await prisma.tour.findMany({
        where: { id: { in: ids } },
        include: { translations: { where: { language } }, city: true, country: true },
      })
    : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const data = ids.map((id) => byId.get(id)).filter((x): x is TourWithRelations => !!x);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    data,
    pagination: { total, count: data.length, currentPage: page, perPage: limit, totalPages, links: buildPaginationLinks(baseUrl, pagination, page, totalPages) },
  };
}

// Helper function to get a single tour by ID
export async function getTourById(tourId: string, language: string = 'en') {
  return prisma.tour.findUnique({
    where: { id: tourId },
    include: {
      translations: { where: { language } },
      city: true, // City now has translations as JSON field
      country: true, // Country now has translations as JSON field
    },
  });
}

// Helper function to get a single tour by external ID
export async function getTourByExternalId(externalId: number, language: string = 'en') {
  return prisma.tour.findUnique({
    where: { externalId },
    include: {
      translations: { where: { language } },
      city: true, // City now has translations as JSON field
      country: true, // Country now has translations as JSON field
    },
  });
}

// Helper functions for dropdown filters
// REQ-031 (INC-003): antes un findMany con `tours: { some }` + `_count` leía ~600 mil filas por llamada
// y saturaba D1. Ahora un GROUP BY sobre el índice de countryId y la tabla chica de países.
export async function getCountriesWithTourCount(language: string = 'en') {
  void language;
  const [groups, countries] = await Promise.all([
    prisma.tour.groupBy({ by: ['countryId'], where: { isActive: true }, _count: { _all: true } }),
    prisma.country.findMany({ select: { id: true, code: true, translations: true } }),
  ]);
  return countriesWithCounts(countries, groups);
}

export async function getCitiesWithTourCount(countryId?: number, language: string = 'en') {
  return prisma.city.findMany({
    where: {
      ...(countryId && { countryId }),
      tours: { some: { isActive: true } },
    },
    select: {
      id: true,
      countryId: true,
      translations: true,
      _count: { select: { tours: { where: { isActive: true } } } },
    },
    orderBy: { id: 'asc' },
  });
}

// Get metadata about tours
export async function getToursMetadata() {
  const syncMetadata = await prisma.syncMetadata.findUnique({
    where: { provider: 'freetour' },
  });

  const totalTours = await prisma.tour.count({
    where: { isActive: true },
  });

  return {
    lastUpdated: syncMetadata?.lastSyncAt?.toISOString() || null,
    totalTours,
    syncStatus: syncMetadata?.status || 'never_synced',
  };
}

