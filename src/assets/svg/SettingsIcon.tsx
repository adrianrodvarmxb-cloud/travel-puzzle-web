import React from 'react';

interface SettingsIconProps {
  className?: string;
}

export const SettingsIcon = ({ className = '' }: SettingsIconProps) => {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M12 1v6m0 6v6m-9-9h6m6 0h6"></path>
      <path d="m4.93 4.93 4.24 4.24m5.66 0 4.24-4.24m-14.14 14.14 4.24-4.24m5.66 0 4.24 4.24"></path>
    </svg>
  );
};

