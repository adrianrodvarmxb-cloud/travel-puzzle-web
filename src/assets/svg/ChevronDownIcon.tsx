import React from 'react';

interface ChevronDownIconProps {
  className?: string;
  isOpen?: boolean;
}

export const ChevronDownIcon = ({ className = '', isOpen = false }: ChevronDownIconProps) => {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
};

