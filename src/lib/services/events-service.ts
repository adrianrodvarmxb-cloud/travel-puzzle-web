import { TourEvent } from "../api/freetour-client";

export class EventsService {

    static groupEventsByDate(events: TourEvent[]): Record<string, TourEvent[]> {
        return events.reduce((acc, event) => {
            const date = event.date.split(' ')[0];
            acc[date] = acc[date] || [];
            acc[date].push(event);
            return acc;
        }, {} as Record<string, TourEvent[]>);
    }

}