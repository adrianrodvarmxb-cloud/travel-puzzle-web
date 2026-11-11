'use client';

import React from 'react';
import Image from 'next/image';

type LogoSize = 'sm' | 'md' | 'lg' | 'xl' | number;
type LogoShape = 'square' | 'circle' | 'faded';

interface LogoProps {
  size?: LogoSize;
  shape?: LogoShape;
  className?: string;
  alt?: string;
}

const sizeMap: Record<string, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 128,
};

const shapeStyles: Record<LogoShape, string> = {
  square: 'rounded-lg',
  circle: 'rounded-full',
  faded: 'rounded-lg opacity-70 blur-[0.5px]',
};

export const Logo = ({ 
  size = 'md', 
  shape = 'square', 
  className = '',
  alt = 'Travel Puzzle Logo'
}: LogoProps) => {
  // Determine pixel size
  const pixelSize = typeof size === 'number' ? size : sizeMap[size];
  
  // Get shape classes
  const shapeClass = shapeStyles[shape];
  
  return (
    <div 
      className={`relative overflow-hidden ${shapeClass} ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <Image
        src="/brand/logo-animado-128.webp"
        alt={alt}
        fill
        sizes={`${pixelSize}px`}
        className="object-cover"
        unoptimized // REQ-1563 (gate A): mismo logo animado en WebP de 178 KB; sin preload (antes GIF de 6.4 MB precargado)
      />
    </div>
  );
};

