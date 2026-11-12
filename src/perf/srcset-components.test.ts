import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const f = (p: string) => readFileSync(p, 'utf8');

describe('REQ-1563: las fotos grandes usan srcset + sizes (el celular baja un tamaño menor)', () => {
  it('REQ-1563: hero del home', () => {
    const s = f('src/components/home/v2/HeroSearch.tsx');
    expect(s).toMatch(/srcSet=\{transformedSrcSet\(s\.image, \[480, 828, 1200, 1600\]\)\}/);
    expect(s).toMatch(/sizes="100vw"/);
  });
  it('REQ-1563: tarjeta de experiencia', () => {
    const s = f('src/components/tours/ExperienceCard.tsx');
    expect(s).toMatch(/srcSet=\{transformedSrcSet\(card\.image, \[320, 480, 640\]\)\}/);
    expect(s).toMatch(/sizes="\(max-width: 640px\) 92vw, \(max-width: 1024px\) 46vw, 320px"/);
  });
  it('REQ-1563: galería del viaje y ficha del tour', () => {
    expect(f('src/components/trips/TripGallery.tsx')).toMatch(/srcSet=\{transformedSrcSet\(im\.url, /);
    expect(f('src/components/tours/one/TourHeroSection.tsx')).toMatch(/srcSet=\{transformedSrcSet\(main, \[640, 960, 1200\]\)\}/);
  });
});
