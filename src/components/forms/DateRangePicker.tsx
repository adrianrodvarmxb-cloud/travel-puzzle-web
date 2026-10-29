'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@/assets/svg/ChevronDownIcon';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export interface DateRangePickerProps {
    placeholder?: string;
    startDate?: string;
    endDate?: string;
    onDateRangeChange?: (startDate: string | undefined, endDate: string | undefined) => void;
    classNameWrapper?: string;
    className?: string;
    dropdownClassName?: string;
    inputClassName?: string;
}

export function DateRangePicker({
    placeholder = 'Select date range',
    startDate: controlledStartDate,
    endDate: controlledEndDate,
    onDateRangeChange,
    classNameWrapper = '',
    className = '',
    dropdownClassName = '',
    inputClassName = '',
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [startDate, setStartDate] = useState<string>(controlledStartDate || '');
    const [endDate, setEndDate] = useState<string>(controlledEndDate || '');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Sync with controlled values
    useEffect(() => {
        if (controlledStartDate !== undefined) {
            setStartDate(controlledStartDate);
        }
    }, [controlledStartDate]);

    useEffect(() => {
        if (controlledEndDate !== undefined) {
            setEndDate(controlledEndDate);
        }
    }, [controlledEndDate]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStartDate = e.target.value;
        setStartDate(newStartDate);

        // Validate: end date should be after start date
        if (endDate && newStartDate > endDate) {
            setEndDate('');
            onDateRangeChange?.(newStartDate, undefined);
        } else {
            onDateRangeChange?.(newStartDate || undefined, endDate || undefined);
        }
    };

    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEndDate = e.target.value;

        // Validate: end date should be after start date
        if (startDate && newEndDate < startDate) {
            return; // Don't update if invalid
        }

        setEndDate(newEndDate);
        onDateRangeChange?.(startDate || undefined, newEndDate || undefined);
    };

    const formatDateRange = () => {
        if (!startDate && !endDate) {
            return placeholder;
        }
        if (startDate && !endDate) {
            return `From ${formatDisplayDate(startDate)}`;
        }
        if (!startDate && endDate) {
            return `Until ${formatDisplayDate(endDate)}`;
        }
        return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
    };

    const hasValue = startDate || endDate;

    const formatDisplayDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className={`relative ${classNameWrapper}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`field-wrapper-style gap-2 items-center justify-between hover:border-(--tp-border-light) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tp-blue-primary focus-visible:ring-offset-1 focus-visible:border-tp-blue-primary ${className}`}
            >
                <span className={`truncate flex-1 text-left ${!hasValue ? 'text-(--tp-gray-400)' : ''}`}>
                    {formatDateRange()}
                </span>
                <ChevronDownIcon isOpen={isOpen} />
            </button>

            {isOpen && (
                <div className={`absolute right-0 mt-2 bg-background border border-border rounded-md shadow-lg overflow-hidden z-50 p-4 min-w-[320px] ${dropdownClassName}`}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-(--tp-text-primary) mb-2">
                                Start Date
                            </label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={handleStartDateChange}
                                className={inputClassName}
                                min={new Date().toISOString().split('T')[0]} // Prevent past dates
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-(--tp-text-primary) mb-2">
                                End Date
                            </label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={handleEndDateChange}
                                className={inputClassName}
                                min={startDate || new Date().toISOString().split('T')[0]} // End date should be after start date
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-border">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setStartDate('');
                                    setEndDate('');
                                    onDateRangeChange?.(undefined, undefined);
                                    setIsOpen(false);
                                }}
                                className="text-sm"
                            >
                                Clear
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setIsOpen(false)}
                                className="text-sm"
                            >
                                Done
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

