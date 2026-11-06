'use client';

import { useState } from 'react';
import { useEventDetailFTData } from '@/lib/api/hooks';
import { useLanguage } from '@/lib/language-context';
import { CalendarAvailabilityService } from '@/lib/services/calendar/CalendarAvailabilityService';
import { BookingPass, SupportCard } from '@/components/booking/email-ui';
import { EventBookingForm } from './EventBookingForm';
import { EventBookingConfirm } from './EventBookingConfirm';
import { BookingFormProvider, useBookingForm } from './Contexts';
import { paidPolicy } from '@/tours/lib/paid-policy';

interface EventDetailData {
    id: number;
    isAvailable: boolean;
    minAdultsPerBooking: number;
    availableAdultPlaces: number;
    fullPricePerGroup: Record<string, number>;
    payableNowPricePerGroup: Record<string, number>;
    isPartiallyPaid: boolean;
}

interface EventBookingFormClientProps {
    eventId: string;
    language: string;
    languageDisplayName: string;
    languageFlag: string;
    date: string;
    time: string;
    bookingsEnabled: boolean;
    wa: string | null;
    paidEnabled?: boolean;
    /** REQ-083: ADULT_CONTACT_CHECK_ENABLED. */
    adultContactCheck?: boolean;
}

/** Dos pasos: 01 Personas + 02 Tus datos → 03 Confirmar. La lógica vive en BookingFormProvider. */
export function EventBookingFormClient(props: EventBookingFormClientProps) {
    return (
        <BookingFormProvider eventId={props.eventId} bookingsEnabled={props.bookingsEnabled} adultContactCheck={props.adultContactCheck}>
            <Steps {...props} />
        </BookingFormProvider>
    );
}

function Steps({ language, languageDisplayName, languageFlag, date, time, eventId, wa, paidEnabled = false }: EventBookingFormClientProps) {
    const { data: eventDetailFTData, isLoading, error } = useEventDetailFTData(eventId);
    const { language: uiLanguage } = useLanguage();
    const { form } = useBookingForm();
    const [step, setStep] = useState<1 | 2>(1);
    const eventDetailData: EventDetailData | undefined = eventDetailFTData?.data;
    const people = form.adults + form.children;
    const full = eventDetailData?.fullPricePerGroup?.[String(form.adults)];
    const now = eventDetailData?.payableNowPricePerGroup?.[String(form.adults)];
    const policy = paidEnabled && full !== undefined && full > 0
        ? paidPolicy({ fullPrice: full, payNow: now ?? full, isPartiallyPaid: !!eventDetailData?.isPartiallyPaid, currency: 'EUR' }, uiLanguage)
        : null;

    return (
        <>
            <div className="px-5 pt-4">
                <BookingPass
                    label="Fecha de la experiencia"
                    value={CalendarAvailabilityService.formatDateDisplay(date, uiLanguage)}
                    cells={[['Hora', time], ['Idioma', `${languageFlag} ${languageDisplayName}`], ['Quiénes', `${people} ${people === 1 ? 'persona' : 'personas'}`]]}
                />
            </div>
            {step === 1 ? (
                <EventBookingForm
                    language={language}
                    eventDetailData={eventDetailData}
                    isLoading={isLoading}
                    error={error}
                    onNext={() => setStep(2)}
                />
            ) : (
                <EventBookingConfirm onBack={() => setStep(1)} policy={policy} />
            )}
            {wa && <SupportCard n={step === 1 ? 3 : 4} wa={wa} text="¿Dudas antes de reservar? Escríbenos por WhatsApp y te ayudamos." />}
        </>
    );
}
