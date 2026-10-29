import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/es';
import 'dayjs/locale/pt';
import 'dayjs/locale/de';
import 'dayjs/locale/fr';
import 'dayjs/locale/it';
import { SupportedLanguage } from '@/types';
import { CalendarDateInfo, LanguageFlags, LanguageNames } from '@/types/ICalendarTypes';

export class CalendarAvailabilityService {
    static readonly LANGUAGE_FLAGS: LanguageFlags = {
        'English': '🇬🇧',
        'Spanish': '🇪🇸',
        'Portuguese': '🇵🇹',
        'German': '🇩🇪',
        'French': '🇫🇷',
        'Italian': '🇮🇹',
    };

    static readonly LANGUAGE_NAMES: LanguageNames = {
        'English': 'Inglés',
        'Spanish': 'Español',
        'Portuguese': 'Portugués',
        'German': 'Alemán',
        'French': 'Francés',
        'Italian': 'Italiano',
    };

    /**
     * Map SupportedLanguage to dayjs locale codes
     */
    private static getDayjsLocale(language: SupportedLanguage): string {
        const localeMap: Record<SupportedLanguage, string> = {
            'en': 'en',
            'es': 'es',
            'pt': 'pt',
            'de': 'de',
            'fr': 'fr',
            'it': 'it',
        };
        return localeMap[language] || 'en';
    }

    /**
     * Get localized day names (abbreviated)
     */
    static getDaysOfWeek(language: SupportedLanguage): string[] {
        const locale = this.getDayjsLocale(language);
        const days: string[] = [];
        
        // dayjs uses Sunday as 0, but we want Monday as first day
        // So we start from Monday (1) and go to Sunday (0)
        for (let i = 1; i <= 7; i++) {
            const dayIndex = i % 7; // 1->1, 2->2, ..., 6->6, 7->0
            const day = dayjs().locale(locale).day(dayIndex);
            // Get abbreviated day name (first 2 characters)
            const dayName = day.format('dd');
            days.push(dayName);
        }
        
        return days;
    }

    /**
     * Get localized month name
     */
    static getMonthName(monthIndex: number, language: SupportedLanguage): string {
        const locale = this.getDayjsLocale(language);
        const month = dayjs().locale(locale).month(monthIndex);
        return month.format('MMMM');
    }

    /**
     * Get localized current month name
     */
    static getCurrentMonthName(date: Date, language: SupportedLanguage): string {
        const locale = this.getDayjsLocale(language);
        return dayjs(date).locale(locale).format('MMMM');
    }

    /**
     * Format time from date string
     */
    static formatTime(dateStr: string): string {
        const timePart = dateStr.split(' ')[1];
        if (!timePart) return '';
        const [hours, minutes] = timePart.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }

    /**
     * Format date for display with localization
     */
    static formatDateDisplay(dateStr: string, language: SupportedLanguage): string {
        const locale = this.getDayjsLocale(language);
        const date = dayjs(dateStr);
        const today = dayjs().startOf('day');
        const dateOnly = date.startOf('day');

        // Check if it's today
        if (dateOnly.isSame(today)) {
            // Get "Today" translation based on locale
            const todayLabels: Record<string, string> = {
                'en': 'Today',
                'es': 'Hoy',
                'pt': 'Hoje',
                'de': 'Heute',
                'fr': "Aujourd'hui",
                'it': 'Oggi',
            };
            const todayLabel = todayLabels[locale] || 'Today';
            return `${todayLabel}, ${date.locale(locale).format('D MMMM YYYY')}`;
        }
        
        return date.locale(locale).format('D MMMM YYYY');
    }

    /**
     * Calculate full calendar grid dates including empty cells
     */
    static calculateMonthDates(
        currentMonth: Date,
        availableDates: string[],
        language: SupportedLanguage
    ): CalendarDateInfo[] {
        const locale = this.getDayjsLocale(language);
        const monthStart = dayjs(currentMonth).locale(locale).startOf('month');
        const monthEnd = dayjs(currentMonth).locale(locale).endOf('month');
        const daysInMonth = monthEnd.date();
        
        // Get the first day of the month and adjust for Monday = 0
        const firstDayOfWeek = monthStart.day(); // 0 = Sunday, 1 = Monday, etc.
        // Adjust: Monday = 0, Sunday = 6
        const adjustedStartDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

        const dates: CalendarDateInfo[] = [];

        // Add empty cells for days before month starts
        for (let i = 0; i < adjustedStartDay; i++) {
            dates.push({ date: 0, fullDate: '', hasEvents: false });
        }

        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = monthStart.date(day).format('YYYY-MM-DD');
            dates.push({
                date: day,
                fullDate: dateStr,
                hasEvents: availableDates.includes(dateStr),
            });
        }

        return dates;
    }
}
