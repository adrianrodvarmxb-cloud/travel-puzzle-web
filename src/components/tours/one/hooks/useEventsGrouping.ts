import { useMemo } from 'react';
import { TourEvent } from '@/lib/api/freetour-client';
import { EventsService } from '@/lib/services/events-service';

export function useEventsGrouping(events: TourEvent[]) {
    const eventsByDate = useMemo(() => {
        return EventsService.groupEventsByDate(events);
    }, [events]);

    const availableDates = useMemo(() => {
        return Object.keys(eventsByDate).sort();
    }, [eventsByDate]);

    return { eventsByDate, availableDates };
}

