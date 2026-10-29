'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDownIcon } from '@/assets/svg/ChevronDownIcon';
import { Button } from './Button';

interface DropdownProps {
  buttonContent: ReactNode;
  children: ReactNode;
  classNameWrapper?: string;
  className?: string;
  dropdownClassName?: string;
}

export const Dropdown = ({
  buttonContent,
  children,
  classNameWrapper = '',
  className = '',
  dropdownClassName = ''
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className={`relative ${classNameWrapper}`} ref={dropdownRef}>
      <Button
        variant="ghost"
        size='sm'
        onClick={() => setIsOpen(!isOpen)}
        className={`gap-2 text-white hover:bg-white/10 flex items-center ${className}`}
      >
        {buttonContent}
        <ChevronDownIcon isOpen={isOpen} />
      </Button>

      {isOpen && (
        <div className={`absolute right-0 mt-2 bg-background border border-border rounded-md shadow-lg overflow-hidden z-50 ${dropdownClassName}`}>
          <div onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

