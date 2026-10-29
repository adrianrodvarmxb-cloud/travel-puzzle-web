'use client';

import { Navbar } from '@/components/layout/Navbar';
import { SupportedLanguage } from '@/types';
import { CalendarAvailabilityService } from '@/lib/services/calendar/CalendarAvailabilityService';
import { useLanguage } from '@/lib/language-context';
import { EventBackButton } from './EventBackButton';
import { EventBookingFormClient } from './EventBookingFormClient';

interface EventDetailClientProps {
    eventId: string;
    initialLanguage: SupportedLanguage;
    language: string;
    date: string;
    time: string;
}

export function EventDetailClient({
    eventId,
    initialLanguage,
    language: eventLanguage,
    date: eventDate,
    time: eventTime,
}: EventDetailClientProps) {
    // Get current language from context
    const { t } = useLanguage();

    // Get language display name and flag
    const languageDisplayName =
        CalendarAvailabilityService.LANGUAGE_NAMES[eventLanguage] || eventLanguage;
    const languageFlag =
        CalendarAvailabilityService.LANGUAGE_FLAGS[eventLanguage] || '🌐';

    // Get translation for back button using current language
    const backText = t('common.back', 'Back');

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 py-8">
                {/* Back Button */}
                <EventBackButton backText={backText} />

                {/* Booking Form */}
                {eventDate && eventTime && (
                    <EventBookingFormClient
                        eventId={eventId}
                        language={eventLanguage}
                        languageDisplayName={languageDisplayName}
                        languageFlag={languageFlag}
                        date={eventDate}
                        time={eventTime}
                    />
                )}
            </div>
        </div>
    );
}

