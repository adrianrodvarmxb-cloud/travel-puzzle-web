import { Prisma } from '@prisma/client';

// User Types
export type UserRole = 'CLIENT' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
}

// Multi-language support
export type SupportedLanguage = 'en' | 'es' | 'pt' | 'de' | 'fr' | 'it';

export interface MultiLangText {
  en: string | undefined;
  es: string | undefined;
  pt: string | undefined;
  de: string | undefined;
  fr: string | undefined;
  it: string | undefined;
}

export interface MultiLangURL {
  en: string;
  es: string;
  pt: string;
  de: string;
  fr: string;
  it: string;
}

// Tour Types (matching API structure)
export interface TourPrice {
  value: number;
  currency: string;
}

export interface MeetingPoint {
  title: string;
  coordinates: string;
  googlePlaceId: string;
}

export interface TourImage {
  id: number;
  URL: string;
}

export interface POI {
  id: number;
  title: string;
  googlePlaceId: string;
}

// Main Tour Interface (from API)
export interface TourAPI {
  id: number;
  updatedAt: string;
  title: MultiLangText;
  brief: MultiLangText;
  description: MultiLangText;
  providerTitle: string;
  providerPhone: string | null; // Can be null
  URL: string;
  URLs: MultiLangURL;
  price: TourPrice;
  length: string; // Duration like "4:00" or "2:45"
  meetingPoint: MeetingPoint;
  cityId: number;
  countryId: number;
  includes: string[];
  POIs: POI[] | null;
  titleImageURL: string | null; // Can be null
  categoryId: number;
  images: TourImage[] | null;
  videoURL: string | null;
  rating: number | null;
  reviewsNumber: number;
}

// Simplified Tour for UI (our internal format after parsing API)
export interface Tour {
  id: string;
  externalId: number; // API id
  title: string; // Current language
  brief: string | null; // Current language - can be null/undefined
  description: string | null; // Current language - can be null/undefined
  destination: string;
  provider: string;
  providerPhone: string | null; // Can be null
  price: number;
  currency: string;
  images: string[];
  titleImageURL: string | null; // Can be null
  duration: string;
  meetingPoint: MeetingPoint;
  includes: string[];
  POIs?: POI[];
  videoURL?: string | null;
  rating: number | null;
  reviewsNumber: number;
  bookingURL: string; // Language-specific URL
  isActive: boolean;
  createdAt?: Date;

  // Keep full multilang data for language switching
  _multilang?: {
    title: MultiLangText;
    brief: MultiLangText;
    description: MultiLangText;
    URLs: MultiLangURL;
  };
}

// Booking Types
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED';

export interface Booking {
  id: string;
  userId: string;
  tourId: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  externalUrl?: string | null;
  totalAmount: number;
  createdAt: Date;
}

// API Provider Types
export interface ApiProvider {
  id: string;
  name: string;
  endpoint: string;
  isActive: boolean;
  createdAt: Date;
}

// Session Types (for NextAuth)
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
}

// Location Types with Translations
// Keep CountryTranslation for backward compatibility (may be used in other contexts)
export interface CountryTranslation {
  id: string;
  countryId: number;
  language: string;
  name: string;
}

export interface CountryWithTranslations {
  id: number;
  code: string;
  translations: Record<string, string> | null; // JSON format: { "en": "Hungary", "es": "Hungría", ... }
  _count: {
    tours: number;
  };
}

// Keep CityTranslation for backward compatibility (may be used in other contexts)
export interface CityTranslation {
  id: string;
  cityId: number;
  language: string;
  name: string;
}

export interface CityWithTranslations {
  id: number;
  countryId: number;
  translations: Record<string, string> | null; // JSON format: { "en": "Paris", "es": "París", ... }
  _count: {
    tours: number;
  };
}

