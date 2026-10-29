/**
 * Travel Puzzle Design System - TypeScript Tokens
 * For programmatic access to design tokens in React components
 */

export const colors = {
  primary: {
    blue: '#2563eb',
    blueHover: '#1d4ed8',
    blueActive: '#1e40af',
    blueLight: '#3b82f6',
    blueDark: '#1e3a8a',
  },
  accent: {
    orange: '#ff6b3d',
    orangeHover: '#ff5722',
    orangeLight: '#ff8a65',
    red: '#ef4444',
    redHover: '#dc2626',
    purple: '#a855f7',
    purpleHover: '#9333ea',
    green: '#10b981',
    greenHover: '#059669',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    overlay: 'rgba(255, 255, 255, 0.9)',
  },
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    inverse: '#ffffff',
  },
  status: {
    success: '#10b981',
    warning: '#ff6b3d',
    error: '#ef4444',
    info: '#2563eb',
  },
} as const;

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  32: '8rem',     // 128px
} as const;

export const fontSize = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
  '5xl': '3rem',    // 48px
  '6xl': '3.75rem', // 60px
} as const;

export const fontWeight = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  blue: '0 4px 14px 0 rgba(37, 99, 235, 0.39)',
  orange: '0 4px 14px 0 rgba(255, 107, 61, 0.39)',
  purple: '0 4px 14px 0 rgba(168, 85, 247, 0.39)',
  green: '0 4px 14px 0 rgba(16, 185, 129, 0.39)',
  red: '0 4px 14px 0 rgba(239, 68, 68, 0.39)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  '3xl': '2rem',   // 32px
  full: '9999px',  // Pill shape
} as const;

export const borderWidth = {
  0: '0',
  1: '1px',
  2: '2px',
  4: '4px',
  8: '8px',
} as const;

export const duration = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
  slower: '700ms',
} as const;

export const easing = {
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
} as const;

export const gradients = {
  primary: 'linear-gradient(135deg, #ff6b3d 0%, #a855f7 100%)',
  hero: 'linear-gradient(135deg, #ff8a65 0%, #a855f7 50%, #3b82f6 100%)',
  header: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
  overlay: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%)',
} as const;

export const container = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Utility type to get all color values
export type ColorValue = typeof colors[keyof typeof colors][keyof typeof colors[keyof typeof colors]];
export type SpacingValue = typeof spacing[keyof typeof spacing];
export type ShadowValue = typeof shadows[keyof typeof shadows];
export type RadiusValue = typeof borderRadius[keyof typeof borderRadius];

// Export a helper to use design tokens in inline styles
export const designTokens = {
  colors,
  spacing,
  fontSize,
  fontWeight,
  lineHeight,
  shadows,
  borderRadius,
  borderWidth,
  duration,
  easing,
  gradients,
  container,
} as const;

export default designTokens;

