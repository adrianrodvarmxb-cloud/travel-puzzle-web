import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';

describe('REQ-1533: logo del encabezado ligero (gate A)', () => {
  it('REQ-1533: el logo animado servido pesa menos de 250 KB', () => {
    expect(statSync('public/brand/logo-animado-128.webp').size).toBeLessThan(250 * 1024);
  });
  it('REQ-1533: Logo.tsx usa el WebP ligero y no precarga el GIF de 6.4 MB', () => {
    const src = readFileSync('src/components/layout/Logo.tsx', 'utf8');
    expect(src).toContain('/brand/logo-animado-128.webp');
    expect(src).not.toContain('/logo-travel.gif');
    expect(src).not.toMatch(/\bpriority\b/);
  });
  it('REQ-1533: la pantalla de error tampoco descarga el GIF de 6.4 MB', () => {
    expect(readFileSync('src/app/global-error.tsx', 'utf8')).not.toContain('/logo-travel.gif');
  });
});
