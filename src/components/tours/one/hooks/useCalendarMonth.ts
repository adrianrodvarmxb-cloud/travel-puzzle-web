import { useState, useMemo } from 'react';
import { useLanguage } from '@/lib/language-context';
import { CalendarAvailabilityService } from '@/lib/services/calendar';
import { SupportedLanguage } from '@/types';

interface UseCalendarMonthParams {
    availableDates: string[];
}

export function useCalendarMonth({ availableDates }: UseCalendarMonthParams) {
    const { language } = useLanguage();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(prev.getMonth() - 1);
            } else {
                newDate.setMonth(prev.getMonth() + 1);
            }
            return newDate;
        });
    };

    const setMonthFromDate = (dateStr: string) => {
        const dateObj = new Date(dateStr + 'T00:00:00');
        setCurrentMonth(dateObj);
    };

    const monthDates = useMemo(() => {
        return CalendarAvailabilityService.calculateMonthDates(
            currentMonth,
            availableDates,
            language as SupportedLanguage
        );
    }, [currentMonth, availableDates, language]);

    const daysOfWeek = useMemo(() => {
        return CalendarAvailabilityService.getDaysOfWeek(language as SupportedLanguage);
    }, [language]);

    const currentMonthName = CalendarAvailabilityService.getCurrentMonthName(
        currentMonth,
        language as SupportedLanguage
    );
    const currentYear = currentMonth.getFullYear();

    return {
        currentMonth,
        navigateMonth,
        setMonthFromDate,
        monthDates,
        currentMonthName,
        currentYear,
        daysOfWeek,
    };
}

