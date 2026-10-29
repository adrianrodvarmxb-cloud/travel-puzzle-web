import { TourEvent } from '@/lib/api/freetour-client';

export interface TourAvailabilityCalendarProps {
    events: TourEvent[];
    tourId: string;
}

export interface CalendarDateInfo {
    date: number;
    fullDate: string;
    hasEvents: boolean;
}

export type LanguageFlags = Record<string, string>;
export type LanguageNames = Record<string, string>;

