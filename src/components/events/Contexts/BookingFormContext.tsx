'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { buildFTBookingDTO, FTBookingErrorsMap, FTBookingHandlers } from '@/lib/api/schemas/FTBooking.Schema';
import { useFormBuilder } from '@/lib/utils/forms';
import { IzFTBookingDTO } from '@/lib/api/schemas/FTBooking.Schema';
import { StateAction } from '@/globals';
import type { Booking } from '@/booking/gateway-client';
import { checkAdultContact } from '@/booking/lib/adult-contact';

interface BookingFormContextValue {
    form: IzFTBookingDTO;
    setForm: StateAction<IzFTBookingDTO>;
    errors: FTBookingErrorsMap;
    setErrors: StateAction<FTBookingErrorsMap>;
    handlers: FTBookingHandlers;
    isFormValid: () => boolean;
    resetForm: () => void;
    labels?: Partial<Record<keyof IzFTBookingDTO, string>>;
    submitBooking: () => Promise<void>;
    isSubmitting: boolean;
    submitError: string | null;
    isReady: boolean;
    /** Interruptor BOOKINGS_ENABLED. */
    bookingsEnabled: boolean;
    /** Reserva confirmada por Freetour (cuando ya se reservó). */
    booking: Booking | null;
    /** REQ-083: ADULT_CONTACT_CHECK_ENABLED; si está encendida, el contacto debe declararse adulto. */
    adultContactCheck: boolean;
    contactIsAdult: boolean;
    setContactIsAdult: (v: boolean) => void;
}

const BookingFormContext = createContext<BookingFormContextValue | undefined>(undefined);

interface BookingFormProviderProps {
    children: ReactNode;
    eventId: string;
    bookingsEnabled: boolean;
    adultContactCheck?: boolean;
}

export function BookingFormProvider({ children, eventId, bookingsEnabled, adultContactCheck = false }: BookingFormProviderProps) {
    const { data: session } = useSession();
    const builderService = buildFTBookingDTO();
    const {
        form,
        setForm,
        errors,
        setErrors,
        handlers,
        isFormValid,
        resetForm,
        labels,
        isReady,
    } = useFormBuilder({ builderService });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [booking, setBooking] = useState<Booking | null>(null);
    // REQ-083: casilla «soy mayor de edad», sin marcar por omisión.
    const [contactIsAdult, setContactIsAdult] = useState(false);
    // Un token por formulario: si el envío se repite (doble clic, reintento), la pasarela no duplica la reserva.
    const [idempotencyKey] = useState(() => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : undefined));

    // Auto-fill form with authenticated user's data
    useEffect(() => {
        // Set eventId
        handlers.eventId(Number(eventId));

        if (session?.user) {
            // Auto-fill customer data if fields are empty
            if (!form.customer.email && session.user.email) {
                handlers.customer.email(session.user.email);
            }
            if (!form.customer.firstName && session.user.name) {
                // Try to split name into first and last name
                const nameParts = session.user.name.split(' ');
                if (nameParts.length > 0) {
                    handlers.customer.firstName(nameParts[0]);
                }
                if (nameParts.length > 1) {
                    handlers.customer.lastName(nameParts.slice(1).join(' '));
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.user?.email, session?.user?.name, eventId]);

    const submitBooking = async () => {
        setSubmitError(null);

        // Validate form
        if (!isFormValid()) {
            setSubmitError('Revisa los datos del formulario antes de confirmar.');
            return;
        }
        if (!checkAdultContact(contactIsAdult, adultContactCheck).ok) {
            setSubmitError('La persona de contacto de la reserva debe ser mayor de edad.');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/freetour/booking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...form, idempotencyKey, ...(adultContactCheck && { contactIsAdult }) }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'No pudimos confirmar tu reserva. Intenta de nuevo.');
            }

            setBooking(result.booking);
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'No pudimos confirmar tu reserva. Intenta de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const value: BookingFormContextValue = {
        form,
        setForm,
        errors,
        setErrors,
        handlers,
        isFormValid,
        resetForm,
        labels,
        submitBooking,
        isSubmitting,
        submitError,
        isReady,
        bookingsEnabled,
        booking,
        adultContactCheck,
        contactIsAdult,
        setContactIsAdult,
    };

    return (
        <BookingFormContext.Provider value={value}>
            {children}
        </BookingFormContext.Provider>
    );
}

export function useBookingForm() {
    const context = useContext(BookingFormContext);
    if (context === undefined) {
        throw new Error('useBookingForm must be used within a BookingFormProvider');
    }
    return context;
}

