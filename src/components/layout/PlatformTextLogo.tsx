'use client';

import React from 'react';

type LogoSize = 'sm' | 'md' | 'lg' | 'xl';
type LogoLayout = 'inline' | 'stacked';

interface PlatformTextLogoProps {
  size?: LogoSize;
  color?: string;
  className?: string;
  layout?: LogoLayout;
}

const sizeStyles: Record<LogoSize, string> = {
  sm: 'text-base',      // 1rem (16px)
  md: 'text-xl',        // 1.25rem (20px) - default
  lg: 'text-2xl',       // 1.5rem (24px)
  xl: 'text-3xl',       // 1.875rem (30px)
};

export const PlatformTextLogo = ({ 
  size = 'md', 
  color = 'text-white',
  className = '',
  layout = 'stacked'
}: PlatformTextLogoProps) => {
  const sizeClass = sizeStyles[size];
  const baseClasses = `font-bold uppercase ${sizeClass} ${color}`;
  const fontStyle = { fontFamily: 'var(--tp-font-primary)' };
  
  // Inline layout - single line
  if (layout === 'inline') {
    return (
      <span 
        className={`${baseClasses} ${className}`}
        style={fontStyle}
      >
        Travel Puzzle
      </span>
    );
  }
  
  // Stacked layout - two lines (default)
  return (
    <div 
      className={`flex flex-col ${baseClasses} ${className}`}
      style={fontStyle}
    >
      <span>Travel</span>
      <span>Puzzle</span>
    </div>
  );
};

