'use client';

import { useMemo, useState } from 'react';
import { useLanguage } from "@/lib/language-context";
import { useCountries } from '@/lib/queries/tours';
import { transformCountryForFilter } from '@/lib/db/tour-transformer';
import { SearchDropdown } from '@/components/forms/SearchDropdown';
import { DateRangePicker } from '@/components/forms';

type CountryFilter = {
    id: number;
    name: string;
    count: number;
};

export function SearchFormPill() {
    const { t, language } = useLanguage();
    const { data: countriesData, isLoading: isLoadingCountries } = useCountries(language);

    // Create a promise function that returns the filtered countries
    // Use useMemo to ensure it has access to the latest countriesData
    const getCountriesPromise = useMemo(() => {
        return async (): Promise<CountryFilter[]> => {
            if (!countriesData) return [];
            return countriesData.map(country => transformCountryForFilter(country, language));
        };
    }, [countriesData, language]);

    const handleCountrySelect = (country: CountryFilter) => {
        console.log('Selected country:', country);
        // Handle country selection here
    };

    const [startDate, setStartDate] = useState<string | undefined>(undefined);
    const [endDate, setEndDate] = useState<string | undefined>(undefined);

    const handleDateRangeChange = (startDate: string | undefined, endDate: string | undefined) => {
        setStartDate(startDate);
        setEndDate(endDate);
    };

    return (
        <div className="v-center gap-3 bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-2xl">
            <SearchDropdown<CountryFilter>
                placeholder={t('home.searchBooking.searchPlaceholder', 'Search for a country...')}
                dataPromise={getCountriesPromise}
                renderItem={(country) => (
                    <div className="v-center-normal gap-1">
                        <span className="text-sm font-medium">{country.name}</span>
                        {country.count > 0 && (
                            <span className="text-xs text-muted-foreground">
                                {country.count} {country.count === 1 ? 'tour' : 'tours'}
                            </span>
                        )}
                    </div>
                )}
                getItemLabel={(country) => country.name}
                onSelect={handleCountrySelect}
                isLoading={isLoadingCountries}
                className="w-full"
            />

            <DateRangePicker
                placeholder={t('home.searchBooking.dateRangePlaceholder', 'Select date range')}
                startDate={startDate}
                endDate={endDate}
                onDateRangeChange={handleDateRangeChange}
            />
        </div>
    );
}