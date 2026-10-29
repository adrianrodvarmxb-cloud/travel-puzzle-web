import React from 'react';

interface ChevronRightIconProps {
  className?: string;
}

export const ChevronRightIcon = ({ className = '' }: ChevronRightIconProps) => {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6"></path>
    </svg>
  );
};

