import { prisma } from '@/lib/prisma';
import { paginatedQuery, PaginationParams, PaginatedResponse } from '../pagination';
import { Prisma } from '@prisma/client';

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
export async function getCountriesWithTourCount(language: string = 'en') {
  return prisma.country.findMany({
    where: { tours: { some: { isActive: true } } },
    select: {
      id: true,
      code: true,
      translations: true,
      _count: { select: { tours: { where: { isActive: true } } } },
    },
    orderBy: { id: 'asc' },
  });
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

