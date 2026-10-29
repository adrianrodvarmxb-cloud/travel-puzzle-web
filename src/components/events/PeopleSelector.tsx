'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@/assets/svg';

interface EventDetailData {
    id: number;
    isAvailable: boolean;
    minAdultsPerBooking: number;
    availableAdultPlaces: number;
    fullPricePerGroup: Record<string, number>;
    payableNowPricePerGroup: Record<string, number>;
    isPartiallyPaid: boolean;
}

interface PeopleSelectorProps {
    eventDetailData?: EventDetailData;
    value: number;
    onChange: (value: number) => void;
    isLoading?: boolean;
}

export function PeopleSelector({
    eventDetailData,
    value,
    onChange,
    isLoading = false,
}: PeopleSelectorProps) {
    const [isPeopleDropdownOpen, setIsPeopleDropdownOpen] = useState(false);
    const peopleDropdownRef = useRef<HTMLDivElement>(null);

    // Generate people options based on available places
    const maxPeople = eventDetailData?.availableAdultPlaces || 30;
    const minPeople = eventDetailData?.minAdultsPerBooking || 2;
    const peopleOptions = Array.from(
        { length: maxPeople - minPeople + 1 },
        (_, i) => minPeople + i
    );

    // Calculate price per person
    const pricePerPerson = eventDetailData?.fullPricePerGroup?.[value.toString()]
        ? eventDetailData.fullPricePerGroup[value.toString()] / value
        : 65; // Default fallback

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                peopleDropdownRef.current &&
                !peopleDropdownRef.current.contains(event.target as Node)
            ) {
                setIsPeopleDropdownOpen(false);
            }
        };

        if (isPeopleDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPeopleDropdownOpen]);

    const isDisabled = isLoading || !eventDetailData;

    return (
        <div>
            <label className="block text-sm font-medium mb-2">Numero de personas</label>
            <div className="relative" ref={peopleDropdownRef}>
                <button
                    type="button"
                    onClick={() => !isDisabled && setIsPeopleDropdownOpen(!isPeopleDropdownOpen)}
                    disabled={isDisabled}
                    className={`w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-md ${isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-50'
                        }`}
                >
                    <span>
                        {isLoading
                            ? 'Cargando...'
                            : eventDetailData
                                ? `${value} personas`
                                : 'Seleccionar personas'}
                    </span>
                    <ChevronDownIcon isOpen={isPeopleDropdownOpen} className="w-4 h-4" />
                </button>
                {isPeopleDropdownOpen && !isDisabled && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        <div className="px-4 py-2 text-sm text-gray-500 border-b">
                            {minPeople} to {maxPeople} - €{pricePerPerson.toFixed(0)}/persona
                        </div>
                        {peopleOptions.map((num) => (
                            <button
                                key={num}
                                type="button"
                                onClick={() => {
                                    onChange(num);
                                    setIsPeopleDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${value === num ? 'bg-blue-50 font-medium' : ''
                                    }`}
                            >
                                {num} personas
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

