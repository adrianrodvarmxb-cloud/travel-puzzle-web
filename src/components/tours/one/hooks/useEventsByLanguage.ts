import { useMemo } from 'react';
import { TourEvent } from '@/lib/api/freetour-client';

interface UseEventsByLanguageParams {
    selectedDate: string | null;
    eventsByDate: Record<string, TourEvent[]>;
}

export function useEventsByLanguage({ selectedDate, eventsByDate }: UseEventsByLanguageParams) {
    const selectedDateEvents = useMemo(() => {
        if (!selectedDate) return [];
        return eventsByDate[selectedDate] || [];
    }, [selectedDate, eventsByDate]);

    const eventsByLanguage = useMemo(() => {
        const grouped: Record<string, TourEvent[]> = {};
        selectedDateEvents.forEach(event => {
            if (!grouped[event.language]) {
                grouped[event.language] = [];
            }
            grouped[event.language].push(event);
        });
        return grouped;
    }, [selectedDateEvents]);

    return { selectedDateEvents, eventsByLanguage };
}

