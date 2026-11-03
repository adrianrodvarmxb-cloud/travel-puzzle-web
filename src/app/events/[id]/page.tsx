import { notFound } from 'next/navigation';
import { EventDetailClient } from '@/components/events/EventDetailClient';
import { getPreferredLanguage } from '@/lib/utils/cookies';
import { isBookingsEnabled } from '@/booking/lib/flags';
import { contactFromEnv } from '@/booking/tour-summary';
import { whatsappUrl } from '@/notifications/lib/email-layout';

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
            contact={contactFor()}
        />
    );
}


/** WhatsApp y redes para el marco con estilo de correo. */
function contactFor() {
    const c = contactFromEnv(process.env as Record<string, string | undefined>);
    return { wa: whatsappUrl(c.whatsapp, 'Hola Travel Puzzle, tengo una duda antes de reservar.'), socials: c.socials };
}
