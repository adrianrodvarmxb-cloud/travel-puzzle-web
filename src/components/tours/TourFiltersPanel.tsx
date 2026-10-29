import React from 'react';
import { useLanguage } from '@/lib/language-context';
import { TourFilters } from '@/lib/utils/tour-search';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { SearchDropdown } from '@/components/forms/SearchDropdown';

interface TourFiltersPanelProps {
  filters: TourFilters;
  onFilterChange: (filters: TourFilters) => void;
  countries: Array<{ id: number; name: string }>;
  cities: Array<{ id: number; name: string }>;
  isLoadingCities?: boolean;
}

export const TourFiltersPanel: React.FC<TourFiltersPanelProps> = ({
  filters,
  onFilterChange,
  countries,
  cities,
  isLoadingCities = false,
}) => {
  const { t } = useLanguage();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ search: e.target.value });
  };

  const handleCountryChange = (country: { id: number; name: string } | null) => {
    onFilterChange({
      countryId: country?.id,
      cityId: undefined, // Reset city when country changes
    });
  };

  // Get selected country name for display
  const selectedCountry = countries.find(c => c.id === filters.countryId);
  const selectedCountryName = selectedCountry?.name || '';

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFilterChange({ cityId: value ? parseInt(value) : undefined });
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    if (type === 'min') {
      onFilterChange({ minPrice: numValue });
    } else {
      onFilterChange({ maxPrice: numValue });
    }
  };

  const handleClearFilters = () => {
    onFilterChange({
      search: '',
      countryId: undefined,
      cityId: undefined,
      minPrice: undefined,
      maxPrice: undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tours.filters.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t('tours.filters.search')}
          </label>
          <Input
            type="text"
            placeholder={t('tours.filters.searchPlaceholder')}
            value={filters.search || ''}
            onChange={handleSearchChange}
          />
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t('tours.filters.country')}
          </label>
          <SearchDropdown
            placeholder={t('tours.filters.allCountries')}
            value={selectedCountryName || undefined}
            onValueChange={(value) => {
              // Clear filter when input is cleared
              if (!value && filters.countryId) {
                handleCountryChange(null);
              }
            }}
            onSelect={(country) => handleCountryChange(country)}
            dataPromise={async () => countries}
            renderItem={(country) => (
              <span>{country.name}</span>
            )}
            getItemLabel={(country) => country.name}
            className="w-full"
          />
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t('tours.filters.city')}
          </label>
          <select
            className="w-full px-3 py-2 border border-border rounded-md bg-background disabled:opacity-50 disabled:cursor-not-allowed"
            value={filters.cityId || ''}
            onChange={handleCityChange}
            disabled={!filters.countryId || isLoadingCities}
          >
            <option value="">
              {!filters.countryId
                ? t('tours.filters.selectCountryFirst')
                : isLoadingCities
                  ? t('tours.filters.loadingCities')
                  : t('tours.filters.allCities')
              }
            </option>
            {cities.map(city => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t('tours.filters.priceRange')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder={t('tours.filters.minPrice')}
              value={filters.minPrice || ''}
              onChange={(e) => handlePriceChange('min', e.target.value)}
              min="0"
            />
            <Input
              type="number"
              placeholder={t('tours.filters.maxPrice')}
              value={filters.maxPrice || ''}
              onChange={(e) => handlePriceChange('max', e.target.value)}
              min="0"
            />
          </div>
        </div>

        {/* Clear Filters */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleClearFilters}
        >
          {t('tours.filters.clearFilters')}
        </Button>
      </CardContent>
    </Card>
  );
};

