import React from 'react';

interface MedalIconProps {
  className?: string;
}

export const MedalIcon = ({ className = '' }: MedalIconProps) => {
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
      <circle cx="12" cy="8" r="6"></circle>
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"></path>
    </svg>
  );
};

