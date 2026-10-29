import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToursWithFilters, getToursMetadata } from '@/lib/db/repositories/tour-repository';
import type { PaginationParams } from '@/lib/db/pagination';
import type { TourFilters } from '@/lib/db/repositories/tour-repository';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const filters: TourFilters = {
      language: searchParams.get('language') || 'en',
      countryId: searchParams.get('countryId') ? Number(searchParams.get('countryId')) : undefined,
      cityId: searchParams.get('cityId') ? Number(searchParams.get('cityId')) : undefined,
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      categoryId: searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : undefined,
    };

    // Parse pagination
    const pagination: PaginationParams = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      searchValue: searchParams.get('searchValue') || undefined,
      searchBy: searchParams.get('searchBy') ? JSON.parse(searchParams.get('searchBy')!) : undefined,
    };

    // Get base URL for pagination links
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}${request.nextUrl.pathname}`;

    // Fetch tours with filters and pagination
    const toursData = await getToursWithFilters(filters, pagination, baseUrl);
    const metadata = await getToursMetadata();

    return NextResponse.json({
      ...toursData,
      metadata,
    });
  } catch (error) {
    console.error('Tours API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tours' },
      { status: 500 }
    );
  }
}

