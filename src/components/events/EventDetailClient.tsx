'use client';

import { SupportedLanguage } from '@/types';
import { CalendarAvailabilityService } from '@/lib/services/calendar/CalendarAvailabilityService';
import { useLanguage } from '@/lib/language-context';
import { EmailFrame, Hero } from '@/components/booking/email-ui';
import { EventBackButton } from './EventBackButton';
import { EventBookingFormClient } from './EventBookingFormClient';

interface EventDetailClientProps {
    eventId: string;
    initialLanguage: SupportedLanguage;
    language: string;
    date: string;
    time: string;
    /** Interruptor BOOKINGS_ENABLED (lo decide el servidor). */
    bookingsEnabled: boolean;
    /** WhatsApp y redes para el marco (los arma el servidor). */
    contact: { wa: string | null; socials: { name: string; url: string }[] };
    /** PAID_TOURS_ENABLED: muestra pago, cancelación y no presentarse en tours con costo. */
    paidEnabled?: boolean;
    /** REQ-083: ADULT_CONTACT_CHECK_ENABLED, casilla «soy mayor de edad». */
    adultContactCheck?: boolean;
}

/** Paso de reserva con el mismo lenguaje visual que los correos y "Mi reserva". */
export function EventDetailClient({
    eventId,
    language: eventLanguage,
    date: eventDate,
    time: eventTime,
    bookingsEnabled,
    contact,
    paidEnabled = false,
    adultContactCheck = false,
}: EventDetailClientProps) {
    const { t } = useLanguage();
    const languageDisplayName = CalendarAvailabilityService.LANGUAGE_NAMES[eventLanguage] || eventLanguage;
    const languageFlag = CalendarAvailabilityService.LANGUAGE_FLAGS[eventLanguage] || '🌐';

    return (
        <EmailFrame wa={contact.wa} socials={contact.socials}>
            <Hero
                status={bookingsEnabled ? 'Estás por reservar' : 'Reservas en línea muy pronto'}
                dot={bookingsEnabled ? 'bg-[#EAF54F]' : 'bg-[#9AAEE0]'}
                statusText="text-[#F3F8B0]"
                title="Aparta tu lugar"
                subtitle="Confirma las personas y tus datos; te mandamos todo por correo."
            />
            <div className="px-5 pt-4">
                <EventBackButton backText={t('common.back', 'Back')} />
            </div>
            {eventDate && eventTime ? (
                <EventBookingFormClient
                    eventId={eventId}
                    language={eventLanguage}
                    languageDisplayName={languageDisplayName}
                    languageFlag={languageFlag}
                    date={eventDate}
                    time={eventTime}
                    bookingsEnabled={bookingsEnabled}
                    wa={contact.wa}
                    paidEnabled={paidEnabled}
                    adultContactCheck={adultContactCheck}
                />
            ) : (
                <p className="px-6 py-8 text-sm text-gray-600">Elige primero la fecha y el horario en la ficha del tour.</p>
            )}
        </EmailFrame>
    );
}
