'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon } from '@/assets/svg';
import { TourAvailabilityCalendarProps } from '@/types/ICalendarTypes';
import { CalendarAvailabilityService } from '@/lib/services/calendar';
import { SupportedLanguage } from '@/types';
import {
    useCalendarMonth,
    useSelectedDate,
    useEventsGrouping,
    useEventsByLanguage,
    useStoreSelectedDatesLS,
} from './hooks';

export function TourAvailabilityCalendar({ events, tourId }: TourAvailabilityCalendarProps) {
    const router = useRouter();
    const { language } = useLanguage();

    // Group events and get available dates
    const { eventsByDate, availableDates } = useEventsGrouping(events);

    // Handle date selection with localStorage
    const { selectedDate, setSelectedDate, selectedDateForLS } = useSelectedDate({
        tourId,
        availableDates,
    });

    // Store selected date in localStorage
    useStoreSelectedDatesLS(selectedDateForLS);

    // Handle calendar month navigation and date calculations
    const {
        currentMonth,
        navigateMonth,
        setMonthFromDate,
        monthDates,
        currentMonthName,
        currentYear,
        daysOfWeek,
    } = useCalendarMonth({ availableDates });

    // Sync currentMonth when selectedDate is loaded from localStorage
    const hasSyncedMonth = useRef(false);
    useEffect(() => {
        // Reset when tourId changes
        hasSyncedMonth.current = false;
    }, [tourId]);

    useEffect(() => {
        if (selectedDate && !hasSyncedMonth.current) {
            // Check if selectedDate is in a different month than currentMonth
            const selectedDateObj = new Date(selectedDate + 'T00:00:00');
            const selectedMonth = selectedDateObj.getMonth();
            const selectedYear = selectedDateObj.getFullYear();
            const currentMonthValue = currentMonth.getMonth();
            const currentYearValue = currentMonth.getFullYear();

            if (selectedMonth !== currentMonthValue || selectedYear !== currentYearValue) {
                setMonthFromDate(selectedDate);
            }
            hasSyncedMonth.current = true;
        }
    }, [selectedDate, currentMonth, setMonthFromDate]);

    // Get events grouped by language for selected date
    const { eventsByLanguage } = useEventsByLanguage({
        selectedDate,
        eventsByDate,
    });

    // Format time helper
    const formatTime = (dateStr: string): string => {
        return CalendarAvailabilityService.formatTime(dateStr);
    };

    // Format date display helper
    const formatDateDisplay = (dateStr: string): string => {
        return CalendarAvailabilityService.formatDateDisplay(dateStr, language as SupportedLanguage);
    };

    return (
        <div className="space-y-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                    aria-label="Previous month"
                >
                    <ChevronLeftIcon className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
                    <span className="font-medium text-sm capitalize">
                        {currentMonthName} {currentYear}
                    </span>
                </div>

                <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                    aria-label="Next month"
                >
                    <ChevronRightIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {daysOfWeek.map((day, index) => (
                    <div
                        key={index}
                        className="text-center text-xs font-medium text-muted-foreground py-2"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
                {monthDates.map((dateInfo, index) => {
                    if (dateInfo.date === 0) {
                        return <div key={index} className="aspect-square" />;
                    }

                    const isSelected = selectedDate === dateInfo.fullDate;
                    const hasEvents = dateInfo.hasEvents;

                    const handleDateClick = () => {
                        if (hasEvents) {
                            setSelectedDate(dateInfo.fullDate);
                        }
                    };

                    return (
                        <button
                            key={index}
                            onClick={handleDateClick}
                            disabled={!hasEvents}
                            className={`
                                aspect-square rounded-full text-sm font-medium transition-all
                                ${isSelected
                                    ? 'bg-tp-blue-primary text-white'
                                    : hasEvents
                                        ? 'bg-muted text-foreground hover:bg-tp-blue-primary/10 border-b-2 border-tp-blue-primary cursor-pointer'
                                        : 'text-muted-foreground/30 cursor-not-allowed'
                                }
                            `}
                        >
                            {dateInfo.date}
                        </button>
                    );
                })}
            </div>

            {/* Divider */}
            <div className="border-t my-4" />

            {/* Selected Date Display */}
            {selectedDate && (
                <>
                    <div className="text-sm font-medium mb-4">
                        {formatDateDisplay(selectedDate)}
                    </div>

                    {/* Languages and Times */}
                    <div className="space-y-4">
                        {Object.entries(eventsByLanguage).map(([lang, langEvents]) => (
                            <div key={lang} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">
                                        {CalendarAvailabilityService.LANGUAGE_FLAGS[lang] || '🌐'}
                                    </span>
                                    <span className="text-sm font-medium">
                                        {CalendarAvailabilityService.LANGUAGE_NAMES[lang] || lang}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <ClockIcon className="w-4 h-4 text-muted-foreground" />
                                    {langEvents.map((event) => (
                                        <button
                                            key={event.id}
                                            onClick={() => router.push(`/events/${event.id}?language=${encodeURIComponent(lang)}&date=${encodeURIComponent(selectedDate)}&time=${encodeURIComponent(formatTime(event.date))}`)}
                                            className="px-3 py-1.5 bg-muted rounded-full text-sm font-medium hover:bg-tp-blue-primary/10 transition-colors cursor-pointer"
                                        >
                                            {formatTime(event.date)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Divider */}
            <div className="border-t my-4" />
        </div>
    );
}
