import { sellerFor } from "@/ficha/lib/operator";
import { publicRating } from "@/ficha/lib/rating-visibility";
import { Tour, MeetingPoint, CountryWithTranslations, CityWithTranslations, TourAPI, SupportedLanguage } from '@/types';
import type { TourWithRelations } from './repositories/tour-repository';

// REQ-10652: nota y conteo que llegan a la pantalla, según el proveedor de la fila.
function publicRatingOf(dbTour: { providerId?: string | null; rating: unknown; reviewsNumber: number }): { rating: number | null; reviewsNumber: number } {
  const r = publicRating(dbTour.providerId, dbTour.rating ? Number(dbTour.rating) : null, dbTour.reviewsNumber);
  return { rating: r.rating, reviewsNumber: r.reviews };
}

/**
 * Transform a database tour with relations to the UI Tour format
 * Note: Translations should already be filtered by language in the query
 */
export function transformDBTourToUITour(dbTour: TourWithRelations, language: string = 'en'): Tour {
  // Get the first translation (should only be one for the requested language)
  const translation = dbTour.translations[0];
  
  // Extract city name from JSON translations object
  const cityTranslations = dbTour.city.translations as Record<string, string> | null;
  const cityName = cityTranslations?.[language] || cityTranslations?.en || `City ${dbTour.cityId}`;

  // Parse images from JSON
  const images = Array.isArray(dbTour.images)
    ? (dbTour.images as Array<string | { URL: string }>).map(img => typeof img === 'string' ? img : img.URL)
    : [];

  // Ensure titleImageURL is first (if it exists)
  const allImages = dbTour.titleImageURL
    ? [dbTour.titleImageURL, ...images.filter(img => img !== dbTour.titleImageURL)]
    : images;

  // Parse meeting point
  const meetingPoint = dbTour.meetingPoint as unknown as MeetingPoint;

  // Parse includes
  const includes = Array.isArray(dbTour.includes)
    ? (dbTour.includes as string[])
    : [];

  return {
    id: dbTour.id,
    externalId: dbTour.externalId,
    title: translation?.title || '',
    brief: translation?.brief || null,
    description: translation?.description || null,
    destination: cityName,
    // REQ-10651 (INC-022): el navegador recalcula el tour con esta función; la casilla Proveedor dice la marca que vende.
    provider: sellerFor((dbTour as { providerId?: string | null }).providerId, dbTour.providerTitle) ?? dbTour.providerTitle,
    providerPhone: dbTour.providerPhone,
    price: Number(dbTour.priceValue),
    currency: dbTour.priceCurrency,
    images: allImages,
    titleImageURL: dbTour.titleImageURL,
    duration: dbTour.duration,
    meetingPoint,
    includes,
    // REQ-10652 (decisión 18): la nota de Tangol no sale al visitante; el dato sigue en la base para ordenar.
    ...publicRatingOf(dbTour),
    bookingURL: translation?.url || '',
    isActive: dbTour.isActive,
    createdAt: dbTour.createdAt,
  };
}

/**
 * Transform multiple DB tours to UI tours
 * Note: Translations should already be filtered by language in the query
 */
export function transformDBToursToUITours(dbTours: TourWithRelations[], language: string = 'en'): Tour[] {
  return dbTours.map(tour => transformDBTourToUITour(tour, language));
}

/**
 * Transform country from DB to UI format for filters
 */
export function transformCountryForFilter(country: CountryWithTranslations, language: string = 'en') {
  // Extract name from JSON translations object
  const translations = country.translations as Record<string, string> | null;
  const name = translations?.[language] || translations?.en || `Country ${country.id}`;
  
  return {
    id: country.id,
    name,
    count: country._count?.tours || 0,
  };
}

/**
 * Transform city from DB to UI format for filters
 */
export function transformCityForFilter(city: CityWithTranslations, language: string = 'en') {
  // Extract name from JSON translations object
  const translations = city.translations as Record<string, string> | null;
  const name = translations?.[language] || translations?.en || `City ${city.id}`;
  
  return {
    id: city.id,
    name,
    count: city._count?.tours || 0,
  };
}

export function transformFTTourToUITour(ftTour: TourAPI, language: string): Tour {
  return {
    id: `ft-${ftTour.id}`,
    externalId: ftTour.id,
    title: ftTour.title[language as SupportedLanguage] || '',
    brief: ftTour.brief[language as SupportedLanguage] || '',
    description: ftTour.description[language as SupportedLanguage] || '',
    destination: ftTour.meetingPoint.title,
    provider: ftTour.providerTitle,
    providerPhone: ftTour.providerPhone,
    price: ftTour.price.value,
    currency: ftTour.price.currency,
    images: ftTour.images?.map(img => img.URL) || [],
    titleImageURL: ftTour.titleImageURL,
    duration: ftTour.length,
    meetingPoint: ftTour.meetingPoint,
    includes: ftTour.includes,
    rating: ftTour.rating,
    reviewsNumber: ftTour.reviewsNumber,
    videoURL: ftTour.videoURL,
    POIs: ftTour.POIs || [],
    bookingURL: ftTour.URLs[language as SupportedLanguage] || '',
    isActive: true,
    createdAt: new Date(),
  };
}