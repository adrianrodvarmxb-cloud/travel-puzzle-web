import { prisma, getD1 } from '@/lib/prisma';
import { paginatedQuery, buildPaginationLinks, PaginationParams, PaginatedResponse } from '../pagination';
import { loadCatalog } from '@/catalog/snapshot';
import { queryCatalog, splitDestination, type CatalogEntry } from '@/catalog/lib/query';
import { rankedTourIds } from '@/search/ranked';
import { isSearchV2 } from '@/search/lib/fts-query';
import { fuzzySearch, isSearchFuzzy } from '@/search/fuzzy';
import { loadDbAliases, type D1Read } from '@/search/db-aliases';
import { Prisma } from '@prisma/client';
import { durationRangeWhere, type DurationRange } from '@/tours/lib/duration';
import { countriesWithCounts } from '@/tours/lib/d1-load';
import { scrubTourRow } from '@/tours/lib/provider-text';
import { DEFAULT_DICTIONARY } from '@/taxonomy/data';
import { formatDefs } from '@/taxonomy/lib/format-defs';

/** REQ-1256: tipos principales de /tours, del diccionario. */
const TOURS_FORMATOS = formatDefs(DEFAULT_DICTIONARY).map((d) => d.slug);

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
  /** T4 (REQ-413): formatos de la taxonomía (?formato=); solo cuentan con `taxonomy`. */
  formatos?: string[]; taxonomy?: boolean;
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

  // REQ-1243 (D31): los textos del proveedor salen sin la plataforma; la base no cambia.
  const page = await paginatedQuery<TourWithRelations>(
    prisma.tour,
    where,
    include,
    pagination,
    baseUrl,
    orderByMapping
  );
  return { ...page, data: page.data.map(scrubTourRow) };
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
  let search = pagination.searchValue;
  if (searchV2) {
    entries = await loadCatalog(language);
    // REQ-285: con SEARCH_FUZZY_ENABLED="true", alias curados y erratas se resuelven antes de buscar
    // (Cuzco → Cusco, Barselona → Barcelona). Apagada (o si falla), el texto tal cual.
    const fuzzyOn = isSearchFuzzy(process.env.SEARCH_FUZZY_ENABLED);
    // REQ-354: alias de destino_alias (S5) si la tabla existe; si no, [] y solo los curados
    const dbAliases = fuzzyOn ? await loadDbAliases(() => getD1() as unknown as D1Read) : undefined;
    search = fuzzySearch(entries, search, fuzzyOn, dbAliases)?.text ?? search;
    const split = splitDestination(entries, search);
    ranked = split ? (split.rest ? await rankedTourIds(language, split.rest, split.name) : null) : await rankedTourIds(language, search);
  } else {
    [entries, ranked] = await Promise.all([loadCatalog(language), rankedTourIds(language, pagination.searchValue)]);
  }
  const { ids, total, page, limit, formatCounts } = queryCatalog(entries, {
    countryId: filters.countryId, cityId: filters.cityId, categoryId: filters.categoryId,
    minPrice: filters.minPrice, maxPrice: filters.maxPrice, durationRange: filters.durationRange,
    search, // REQ-285: el texto resuelto (igual al de la URL si la bandera está apagada)
    guideLanguage: filters.guideLanguage, date: filters.date, groups: filters.groups, freeCancel: filters.freeCancel,
    privateOnly: filters.privateOnly, hotelPickup: filters.hotelPickup, novelty: filters.novelty,
    durMin: filters.durMin, durMax: filters.durMax,
    ranked, // REQ-048: relevancia FTS5 (null = búsqueda por palabras)
    searchV2, // REQ-122
    taxonomy: filters.taxonomy, formatos: filters.formatos, // T4
    formatosTours: TOURS_FORMATOS, // REQ-1256: del diccionario
  }, pagination);
  const rows = ids.length
    ? await prisma.tour.findMany({
        where: { id: { in: ids } },
        include: { translations: { where: { language } }, city: true, country: true },
      })
    : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  // REQ-548: cada fila lleva el formato del índice (el mismo que filtra ?formato= y cuenta los chips), para la tarjeta.
  const formatoById = new Map(entries.map((e) => [e.id, e.formato]));
  const data = ids.map((id) => byId.get(id)).filter((x): x is TourWithRelations => !!x).map((r) => scrubTourRow(Object.assign(r, { formato: formatoById.get(r.id) }))); // REQ-1243 (D31)
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    data,
    pagination: { total, count: data.length, currentPage: page, perPage: limit, totalPages, links: buildPaginationLinks(baseUrl, pagination, page, totalPages) },
    ...(formatCounts && { facets: { formato: formatCounts } }),
  };
}

// Helper function to get a single tour by ID
export async function getTourById(tourId: string, language: string = 'en') {
  const row = await prisma.tour.findUnique({
    where: { id: tourId },
    include: {
      translations: { where: { language } },
      city: true, // City now has translations as JSON field
      country: true, // Country now has translations as JSON field
    },
  });
  return row && scrubTourRow(row); // REQ-1243 (D31): ficha, su JSON-LD y el dato que viaja al cliente
}

// Helper function to get a single tour by external ID
export async function getTourByExternalId(externalId: number, language: string = 'en') {
  const row = await prisma.tour.findUnique({
    where: { providerId_externalId: { providerId: 'freetour', externalId } }, // REQ-1623
    include: {
      translations: { where: { language } },
      city: true, // City now has translations as JSON field
      country: true, // Country now has translations as JSON field
    },
  });
  return row && scrubTourRow(row); // REQ-1243 (D31): ficha, su JSON-LD y el dato que viaja al cliente
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

