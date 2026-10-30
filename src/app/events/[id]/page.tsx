import { notFound } from 'next/navigation';
import { EventDetailClient } from '@/components/events/EventDetailClient';
import { getPreferredLanguage } from '@/lib/utils/cookies';
import { isBookingsEnabled } from '@/booking/lib/flags';

interface EventDetailPageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{
        language?: string;
        date?: string;
        time?: string;
    }>;
}

export const dynamic = 'force-dynamic';

export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
    // Get language from cookies, default to 'en'
    const language = await getPreferredLanguage();

    // Get event ID from params
    const { id } = await params;
    const eventId = id;

    if (!eventId) {
        notFound();
    }

    // Extract search params
    const resolvedSearchParams = await searchParams;
    const eventLanguage = resolvedSearchParams.language || 'English';
    const eventDate = resolvedSearchParams.date || '';
    const eventTime = resolvedSearchParams.time || '';

    return (
        <EventDetailClient
            eventId={eventId}
            initialLanguage={language}
            language={eventLanguage}
            date={eventDate}
            time={eventTime}
            bookingsEnabled={isBookingsEnabled(process.env.BOOKINGS_ENABLED)}
        />
    );
}

