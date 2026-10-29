'use client';

import React, { CSSProperties, ReactNode } from 'react';

interface IconElementProps {
  iconDef: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export const IconElement = ({ iconDef, className = '', style }: IconElementProps) => {
  return (
    <span className={className} style={style}>
      {iconDef}
    </span>
  );
};

