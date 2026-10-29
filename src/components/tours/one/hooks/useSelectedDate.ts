import { useState, useEffect, useRef } from 'react';
import { LS_KEYS } from '@/globals';
import { ILSSelectedDate } from '@/types/ILocalStorageTypes';

interface UseSelectedDateParams {
    tourId: string;
    availableDates: string[];
}

export function useSelectedDate({ tourId, availableDates }: UseSelectedDateParams) {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const hasLoadedFromLS = useRef(false);
    const loadedDateFromLS = useRef(false);
    const isUserInteraction = useRef(false);
    const isInitialized = useRef(false);

    // Reset flags when tourId changes
    useEffect(() => {
        hasLoadedFromLS.current = false;
        loadedDateFromLS.current = false;
        isUserInteraction.current = false;
        isInitialized.current = false;
        setSelectedDate(null);
    }, [tourId]);

    // Load selected date from localStorage on mount (after availableDates is ready)
    useEffect(() => {
        // Only load once when availableDates is ready and we haven't loaded yet
        if (availableDates.length > 0 && !hasLoadedFromLS.current) {
            try {
                const stored = localStorage.getItem(LS_KEYS.selectedDates);
                if (stored) {
                    const parsed: ILSSelectedDate | null = JSON.parse(stored);
                    // Only use stored date if it matches the current tourId, is not null, and exists in available dates
                    if (parsed && parsed.tourId === tourId && parsed.date && availableDates.includes(parsed.date)) {
                        // Set both state updates together to ensure they're in sync
                        setSelectedDate(parsed.date);
                        loadedDateFromLS.current = true;
                        // Mark as initialized since we loaded a date
                        isInitialized.current = true;
                    }
                }
            } catch (error) {
                console.error('Error loading selected date from localStorage:', error);
            }
            // Mark as attempted even if no valid date was found
            hasLoadedFromLS.current = true;
        }
    }, [tourId, availableDates]);

    // Auto-select first available date if none selected (only after localStorage load attempt)
    // Only run if we didn't load a date from localStorage
    useEffect(() => {
        // Only auto-select if we've attempted to load from LS, no date is selected, we didn't load from LS, and dates are available
        if (hasLoadedFromLS.current && !selectedDate && !loadedDateFromLS.current && availableDates.length > 0) {
            setSelectedDate(availableDates[0]);
            // Mark as initialized after auto-select
            isInitialized.current = true;
        } else if (hasLoadedFromLS.current && selectedDate && !isInitialized.current) {
            // Mark as initialized if we have a date but haven't initialized yet (shouldn't happen, but safety check)
            isInitialized.current = true;
        }
    }, [availableDates, selectedDate]);

    // Wrapper for setSelectedDate that marks user interaction
    const handleSetSelectedDate = (date: string | null) => {
        isUserInteraction.current = true;
        setSelectedDate(date);
    };

    // Store selected date in localStorage when it changes (only after initialization and user interaction)
    // Don't save auto-selected dates on initial mount
    const selectedDateForLS: ILSSelectedDate | null = selectedDate && isInitialized.current && isUserInteraction.current
        ? { date: selectedDate, tourId }
        : null;

    return {
        selectedDate,
        setSelectedDate: handleSetSelectedDate,
        selectedDateForLS,
    };
}

