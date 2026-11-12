import { describe, it, expect } from 'vitest';
import { PAGE_STEP, visibleSlice, nextVisible, hasMore } from './paging';

describe('REQ-3501: viajes de agencias por partes (gate E)', () => {
  it('REQ-3501: se abren 24', () => {
    expect(PAGE_STEP).toBe(24);
    expect(visibleSlice(Array.from({ length: 266 }, (_, i) => i), PAGE_STEP)).toHaveLength(24);
    expect(visibleSlice([1, 2, 3], PAGE_STEP)).toEqual([1, 2, 3]);
  });
  it('REQ-3501: «Ver más» suma 24 sin pasarse del total', () => {
    expect(nextVisible(24, 266)).toBe(48);
    expect(nextVisible(264, 266)).toBe(266);
  });
  it('REQ-3501: el botón solo aparece si quedan más', () => {
    expect(hasMore(24, 266)).toBe(true);
    expect(hasMore(24, 24)).toBe(false);
    expect(hasMore(24, 3)).toBe(false);
  });
});

describe('REQ-3501: OwnTripsInTours usa la paginación', () => {
  it('REQ-3501: pinta visibleSlice, tiene el botón y vuelve a 24 al cambiar filtros', async () => {
    const { readFileSync } = await import('node:fs');
    const s = readFileSync('src/components/trips/OwnTripsInTours.tsx', 'utf8');
    expect(s).toMatch(/visibleSlice\(list, shown\)\.map/);
    expect(s).toMatch(/hasMore\(shown, list\.length\)/);
    expect(s).toMatch(/c\.showMore/);
    expect(s).toMatch(/useEffect\(\(\) => setShown\(PAGE_STEP\), \[filterKey\]\)/);
  });
  it('REQ-3501: el texto del botón existe en español e inglés', async () => {
    const { tripCopy } = await import('./copy');
    expect(tripCopy('es').showMore).toBe('Ver más experiencias');
    expect(tripCopy('en').showMore).toBe('Show more experiences');
  });
});
