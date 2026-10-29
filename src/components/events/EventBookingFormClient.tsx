'use client';

import { useState } from 'react';
import { Accordion, AccordionItem } from '@heroui/react';
import { useEventDetailFTData } from '@/lib/api/hooks';
import { EventBookingForm } from './EventBookingForm';
import { EventBookingPayment } from './EventBookingPayment';
import { BookingFormProvider } from './Contexts';

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
}

export function EventBookingFormClient({
    eventId,
    language,
    languageDisplayName,
    languageFlag,
    date,
    time,
}: EventBookingFormClientProps) {
    const { data: eventDetailFTData, isLoading, error } = useEventDetailFTData(eventId);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(['1']));

    const eventDetailData: EventDetailData | undefined = eventDetailFTData?.data;

    const handleNext = () => {
        // Close current step (1) and open next step (2)
        setSelectedKeys(new Set(['2']));
    };

    const handleBack = () => {
        // Close current step (2) and open previous step (1)
        setSelectedKeys(new Set(['1']));
    };

    const titleElement = (text: string) => (
        <div className='v-center-normal gap-3 text-lg font-semibold cursor-pointer hover:bg-gray-100 rounded-lg p-2'>
            <span className='text-tp-blue-primary'>{text}</span>
        </div>
    )

    return (
        <BookingFormProvider eventId={eventId}>
            <Accordion
                selectedKeys={selectedKeys}
                onSelectionChange={(keys) => setSelectedKeys(keys as Set<string>)}
                selectionMode="single"
                variant="bordered"
            >
                <AccordionItem
                    key="1"
                    title={titleElement('1. Detalles de la reserva')}
                    aria-label="Step 1: Booking Details"
                >
                    <EventBookingForm
                        language={language}
                        languageDisplayName={languageDisplayName}
                        languageFlag={languageFlag}
                        date={date}
                        time={time}
                        eventDetailData={eventDetailData}
                        isLoading={isLoading}
                        error={error}
                        onNext={handleNext}
                    />
                </AccordionItem>
                <AccordionItem
                    key="2"
                    title={titleElement('2. Pago')}
                    aria-label="Step 2: Payment"
                >
                    <EventBookingPayment onBack={handleBack} />
                </AccordionItem>
            </Accordion>
        </BookingFormProvider>
    );
}

