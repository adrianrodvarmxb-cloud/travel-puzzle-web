import { freeTourClient, FreeTourCountry, FreeTourCity } from '@/lib/api/freetour-client';
import { prisma } from '@/lib/prisma';
import { TourAPI, SupportedLanguage } from '@/types';
import { upsertCountry } from '../repositories/country-repository';
import { upsertCity } from '../repositories/city-repository';
import { Prisma } from '@prisma/client';

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'es', 'pt', 'de', 'fr', 'it'];

// Cache countries to avoid refetching
let countriesCache: Map<number, FreeTourCountry> | null = null;

async function loadCountriesData(): Promise<Map<number, FreeTourCountry>> {
  if (countriesCache) return countriesCache;
  
  console.log('📥 Fetching countries data from API...');
  const response = await freeTourClient.fetchCountries();
  
  countriesCache = new Map(
    response.data.map((country: FreeTourCountry) => [country.id, country])
  );
  
  console.log(`✅ Loaded ${countriesCache.size} countries`);
  return countriesCache;
}

interface SyncResult {
  success: boolean;
  toursCount: number;
  countriesCount: number;
  citiesCount: number;
  duration: number;
  error?: string;
}

/**
 * Sync tours from FreeTour API to MySQL database incrementally with retry logic
 * Fetches and syncs batch by batch for gradual database population
 * @param maxPages - Optional limit on pages to sync
 * @param startPage - Page to resume from (for retries)
 */
export async function syncToursFromAPI(maxPages?: number, startPage: number = 1): Promise<SyncResult> {
  const startTime = Date.now();
  console.log(`🚀 Starting incremental tour sync from FreeTour API (from page ${startPage})...`);

  // Track all synced data
  const syncedCountries = new Set<number>();
  const syncedCities = new Set<number>();
  let totalToursSynced = 0;
  let currentPage = startPage;

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 30000; // 30 seconds

  try {
    // Update sync metadata to "in_progress"
    await prisma.syncMetadata.upsert({
      where: { provider: 'freetour' },
      update: { status: 'in_progress', lastSyncAt: new Date() },
      create: {
        provider: 'freetour',
        status: 'in_progress',
        lastSyncAt: new Date(),
        toursCount: 0,
      },
    });

    // Fetch first page to get total pages
    console.log('📥 Fetching first page to determine total pages...');
    const firstPage = await fetchWithRetry(() => freeTourClient.fetchTours(1), 1, MAX_RETRIES, RETRY_DELAY);
    const { totalPages } = firstPage.data;
    const pagesToFetch = maxPages ? Math.min(maxPages, totalPages) : totalPages;

    console.log(`📊 Total pages to sync: ${pagesToFetch} (${firstPage.data.totalObjects} tours)`);

    // Process first page if starting from page 1
    if (startPage === 1) {
      await processTourBatch(firstPage.data.tours, syncedCountries, syncedCities);
      totalToursSynced += firstPage.data.tours.length;
      console.log(`  ✅ Page 1/${pagesToFetch} synced (${totalToursSynced} tours)`);
      currentPage = 2;
    }

    // Fetch and sync remaining pages in batches
    const CONCURRENT_PAGES = 3; // Fetch 3 pages concurrently, then sync
    const remainingPages = Array.from({ length: pagesToFetch - currentPage + 1 }, (_, i) => i + currentPage);

    for (let i = 0; i < remainingPages.length; i += CONCURRENT_PAGES) {
      const pageBatch = remainingPages.slice(i, i + CONCURRENT_PAGES);
      
      try {
        // Fetch pages concurrently with retry logic
        const pageResults = await Promise.all(
          pageBatch.map(page => fetchWithRetry(
            () => freeTourClient.fetchTours(page),
            page,
            MAX_RETRIES,
            RETRY_DELAY
          ))
        );

        // Sync each page's tours immediately
        for (let j = 0; j < pageResults.length; j++) {
          const pageData = pageResults[j].data;
          await processTourBatch(pageData.tours, syncedCountries, syncedCities);
          totalToursSynced += pageData.tours.length;
          
          currentPage = pageBatch[j];
          console.log(`  ✅ Page ${currentPage}/${pagesToFetch} synced (${totalToursSynced} tours total)`);

          // Save progress every 10 pages
          if (currentPage % 10 === 0) {
            await saveProgress(currentPage, totalToursSynced, new Date());
          }
        }

        // Small delay between batches to avoid overwhelming the database
        if (i + CONCURRENT_PAGES < remainingPages.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        // Save progress before throwing
        await saveProgress(currentPage - 1, totalToursSynced, new Date());
        console.error(`❌ Failed at page ${currentPage}. Progress saved. You can resume from page ${currentPage}.`);
        throw error;
      }
    }

    const duration = (Date.now() - startTime) / 1000;

    // Update sync metadata with success
    await prisma.syncMetadata.update({
      where: { provider: 'freetour' },
      data: {
        status: 'completed',
        toursCount: totalToursSynced,
        lastSyncAt: new Date(),
      },
    });

    console.log(`\n✅ Sync completed successfully in ${duration.toFixed(2)}s`);
    console.log(`   Tours: ${totalToursSynced}`);
    console.log(`   Countries: ${syncedCountries.size}`);
    console.log(`   Cities: ${syncedCities.size}`);

    return {
      success: true,
      toursCount: totalToursSynced,
      countriesCount: syncedCountries.size,
      citiesCount: syncedCities.size,
      duration,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const failedAt = new Date();
    
    console.error('❌ Sync failed:', errorMessage);
    console.error(`📅 Failed at: ${failedAt.toISOString()}`);
    console.error(`📄 Last successful page: ${currentPage - 1}`);
    console.error(`📊 Tours synced before failure: ${totalToursSynced}`);
    console.log(`\n🔄 To resume sync from page ${currentPage}, run:`);
    console.log(`   npm run sync:tours -- --start-page=${currentPage}`);

    // Save final progress
    await saveProgress(currentPage - 1, totalToursSynced, failedAt);

    // Update sync metadata with error
    await prisma.syncMetadata.update({
      where: { provider: 'freetour' },
      data: {
        status: 'failed',
        lastSyncAt: failedAt,
        toursCount: totalToursSynced,
      },
    }).catch(console.error);

    return {
      success: false,
      toursCount: totalToursSynced,
      countriesCount: syncedCountries.size,
      citiesCount: syncedCities.size,
      duration: (Date.now() - startTime) / 1000,
      error: errorMessage,
    };
  }
}

/**
 * Process a batch of tours: sync countries, cities, and tours
 */
async function processTourBatch(
  tours: TourAPI[],
  syncedCountries: Set<number>,
  syncedCities: Set<number>
): Promise<void> {
  // Extract unique countries and cities from this batch
  const batchCountries = new Set<number>();
  const batchCities = new Set<number>();

  tours.forEach((tour) => {
    batchCountries.add(tour.countryId);
    batchCities.add(tour.cityId);
  });

  // Sync new countries
  const newCountries = Array.from(batchCountries).filter(id => !syncedCountries.has(id));
  if (newCountries.length > 0) {
    await syncCountries(tours, newCountries);
    newCountries.forEach(id => syncedCountries.add(id));
  }

  // Sync new cities
  const newCities = Array.from(batchCities).filter(id => !syncedCities.has(id));
  if (newCities.length > 0) {
    await syncCities(tours, newCities);
    newCities.forEach(id => syncedCities.add(id));
  }

  // Sync all tours in batch (in chunks of 10 for better control)
  const TOUR_BATCH_SIZE = 10;
  for (let i = 0; i < tours.length; i += TOUR_BATCH_SIZE) {
    const tourChunk = tours.slice(i, i + TOUR_BATCH_SIZE);
    await Promise.all(tourChunk.map(tour => syncTour(tour)));
  }
}

/**
 * Sync countries with translations
 */
async function syncCountries(tours: TourAPI[], countryIds: number[]) {
  const countriesData = await loadCountriesData();

  for (const countryId of countryIds) {
    const countryInfo = countriesData.get(countryId);
    const countryCode = countryInfo?.shortTitle?.toUpperCase() || `C${countryId}`;
    
    // Build translations object from API data
    const translations: Record<string, string> = {};
    for (const lang of SUPPORTED_LANGUAGES) {
      const countryName = countryInfo?.title[lang];
      if (countryName) {
        translations[lang] = countryName;
      }
    }
    
    // Upsert country with code and translations
    await upsertCountry(countryId, countryCode, translations);
  }
}

/**
 * Sync cities with translations
 */
async function syncCities(tours: TourAPI[], cityIds: number[]) {
  // Group cities by country
  const citiesByCountry = new Map<number, Set<number>>();
  
  tours.forEach((tour) => {
    if (!citiesByCountry.has(tour.countryId)) {
      citiesByCountry.set(tour.countryId, new Set());
    }
    citiesByCountry.get(tour.countryId)!.add(tour.cityId);
  });

  // Fetch and sync cities by country
  for (const [countryId, cityIdsSet] of citiesByCountry) {
    try {
      const response = await freeTourClient.fetchCities(countryId);
      const citiesData = new Map(
        response.data.map((city: FreeTourCity) => [city.id, city])
      );

      for (const cityId of cityIdsSet) {
        if (!cityIds.includes(cityId)) continue;
        
        const cityInfo = citiesData.get(cityId);
        const tour = tours.find(t => t.cityId === cityId);
        if (!tour) continue;

        // Build translations object from API data
        const translations: Record<string, string> = {};
        for (const lang of SUPPORTED_LANGUAGES) {
          const cityName = cityInfo?.title[lang];
          if (cityName) {
            translations[lang] = cityName;
          }
        }
        
        // Upsert city with translations
        await upsertCity(cityId, countryId, translations);
      }
    } catch (error) {
      console.warn(`  ⚠️  Could not fetch cities for country ${countryId}:`, error);
      // If API fetch fails, sync cities without names (will use placeholders)
      for (const cityId of cityIdsSet) {
        if (!cityIds.includes(cityId)) continue;
        const tour = tours.find(t => t.cityId === cityId);
        if (!tour) continue;
        
        // Build placeholder translations
        const translations: Record<string, string> = {};
        for (const lang of SUPPORTED_LANGUAGES) {
          translations[lang] = `City ${cityId}`;
        }
        
        await upsertCity(cityId, countryId, translations);
      }
    }
  }
}

/**
 * Fetch with retry logic and exponential backoff
 */
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  page: number,
  maxRetries: number,
  baseDelay: number
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.warn(
          `⚠️  Page ${page} failed (attempt ${attempt + 1}/${maxRetries + 1}): ${errorMessage}`
        );
        console.log(`   ⏳ Waiting ${delay / 1000}s before retry...`);
        console.log(`   📅 Failed at: ${new Date().toISOString()}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Failed to fetch page ${page} after ${maxRetries + 1} attempts: ${lastError?.message}`
  );
}

/**
 * Save sync progress to database
 */
async function saveProgress(
  lastPage: number,
  tourCount: number,
  timestamp: Date
): Promise<void> {
  try {
    await prisma.syncMetadata.upsert({
      where: { provider: 'freetour' },
      update: {
        status: 'in_progress',
        toursCount: tourCount,
        lastSyncAt: timestamp,
      },
      create: {
        provider: 'freetour',
        status: 'in_progress',
        toursCount: tourCount,
        lastSyncAt: timestamp,
      },
    });
    console.log(`   💾 Progress saved: Page ${lastPage}, ${tourCount} tours at ${timestamp.toISOString()}`);
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
}

/**
 * Sync a single tour with all its translations
 */
async function syncTour(apiTour: TourAPI) {
  // Serialize JSON fields properly for Prisma
  const meetingPointJson = apiTour.meetingPoint as unknown as Prisma.InputJsonValue;
  const includesJson = apiTour.includes as unknown as Prisma.InputJsonValue;
  const poisJson = (apiTour.POIs || null) as unknown as Prisma.InputJsonValue;
  const imagesJson = (apiTour.images || []) as unknown as Prisma.InputJsonValue;

  // Upsert tour with proper relation handling
  const tour = await prisma.tour.upsert({
    where: { externalId: apiTour.id },
    update: {
      providerTitle: apiTour.providerTitle,
      providerPhone: apiTour.providerPhone,
      priceValue: apiTour.price.value,
      priceCurrency: apiTour.price.currency,
      duration: apiTour.length,
      titleImageURL: apiTour.titleImageURL,
      categoryId: apiTour.categoryId,
      rating: apiTour.rating,
      reviewsNumber: apiTour.reviewsNumber,
      cityId: apiTour.cityId,
      countryId: apiTour.countryId,
      meetingPoint: meetingPointJson,
      includes: includesJson,
      POIs: poisJson,
      images: imagesJson,
      videoURL: apiTour.videoURL,
      isActive: true,
      updatedAt: new Date(apiTour.updatedAt),
    },
    create: {
      externalId: apiTour.id,
      providerTitle: apiTour.providerTitle,
      providerPhone: apiTour.providerPhone,
      priceValue: apiTour.price.value,
      priceCurrency: apiTour.price.currency,
      duration: apiTour.length,
      titleImageURL: apiTour.titleImageURL,
      categoryId: apiTour.categoryId,
      rating: apiTour.rating,
      reviewsNumber: apiTour.reviewsNumber,
      meetingPoint: meetingPointJson,
      includes: includesJson,
      POIs: poisJson,
      images: imagesJson,
      videoURL: apiTour.videoURL,
      isActive: true,
      // Connect to existing city and country
      city: { connect: { id: apiTour.cityId } },
      country: { connect: { id: apiTour.countryId } },
    },
  });

  // Upsert translations for each language
  for (const lang of SUPPORTED_LANGUAGES) {
    // Skip if essential fields are missing
    if (!apiTour.title[lang] || !apiTour.URLs[lang]) continue;

    await prisma.tourTranslation.upsert({
      where: {
        tourId_language: {
          tourId: tour.id,
          language: lang,
        },
      },
      update: {
        title: apiTour.title[lang],
        brief: apiTour.brief[lang] ?? null,
        description: apiTour.description[lang] ?? null,
        url: apiTour.URLs[lang],
      },
      create: {
        tourId: tour.id,
        language: lang,
        title: apiTour.title[lang],
        brief: apiTour.brief[lang] ?? null,
        description: apiTour.description[lang] ?? null,
        url: apiTour.URLs[lang],
      },
    });
  }
}

