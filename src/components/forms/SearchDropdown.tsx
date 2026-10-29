'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { Input } from '../ui/Input';
import { Loading } from '../ui/Loading';

export interface SearchDropdownProps<T> {
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onSelect?: (item: T) => void;
  dataPromise: () => Promise<T[]>;
  renderItem: (item: T, index: number) => ReactNode;
  getItemLabel: (item: T) => string;
  filterFunction?: (items: T[], searchValue: string) => T[];
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  maxHeight?: string;
  isLoading?: boolean;
}

export function SearchDropdown<T>({
  placeholder = 'Search...',
  value: controlledValue,
  onValueChange,
  onSelect,
  dataPromise,
  renderItem,
  getItemLabel,
  filterFunction,
  className = '',
  inputClassName = '',
  dropdownClassName = '',
  maxHeight = 'max-h-60',
  isLoading: externalLoading,
}: SearchDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(controlledValue || '');
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch data when dropdown opens
  useEffect(() => {
    if (isOpen && items.length === 0) {
      setIsLoading(true);
      setError(null);
      
      dataPromise()
        .then((data) => {
          setItems(data);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load data');
          setIsLoading(false);
        });
    }
  }, [isOpen, dataPromise, items.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  // Sync controlled value to internal state when it changes externally
  useEffect(() => {
    if (controlledValue !== undefined) {
      setSearchValue(controlledValue);
    }
  }, [controlledValue]);

  // Handle controlled vs uncontrolled value
  // Use searchValue for display to allow typing, but sync with controlledValue when it changes
  const displayValue = searchValue;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    onValueChange?.(newValue);
    
    // Keep dropdown open when typing
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleSelect = (item: T) => {
    const label = getItemLabel(item);
    setSearchValue(label);
    onValueChange?.(label);
    onSelect?.(item);
    setIsOpen(false);
  };

  // Helper function to remove accents from a string
  const removeAccents = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  // Filter items based on search value using RegExp with accent-insensitive matching
  const filteredItems = filterFunction
    ? filterFunction(items, searchValue)
    : (() => {
        if (!searchValue.trim()) {
          return items;
        }
        
        // Normalize search value (remove accents and convert to lowercase)
        const normalizedSearch = removeAccents(searchValue.toLowerCase());
        // Escape special regex characters and create a pattern
        const escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedSearch, 'i');
        
        return items.filter((item) => {
          const label = getItemLabel(item);
          const normalizedLabel = removeAccents(label);
          return searchRegex.test(normalizedLabel);
        });
      })();

  const isReallyLoading = externalLoading !== undefined ? externalLoading : isLoading;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        className={inputClassName}
      />

      {isOpen && (
        <div className={`absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg overflow-hidden z-50 ${maxHeight} overflow-y-auto ${dropdownClassName}`}>
          {isReallyLoading ? (
            <div className="p-4 flex justify-center">
              <Loading size="sm" />
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              {error}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No results found
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <div
                key={index}
                onClick={() => handleSelect(item)}
                className="px-4 py-2 hover:bg-muted cursor-pointer transition-colors"
              >
                {renderItem(item, index)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

