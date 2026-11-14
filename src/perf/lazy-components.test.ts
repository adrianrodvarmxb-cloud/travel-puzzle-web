import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const f = (p: string) => readFileSync(p, 'utf8');

describe('REQ-1564: imágenes bajo el pliegue que la prueba Playwright encontró (12 nov 2026)', () => {
  it('REQ-1564: el ícono de WhatsApp de la sección de expertos y del asesor carga en lazy', () => {
    for (const p of ['src/components/home/v2/ExpertCta.tsx', 'src/components/advisors/AdvisorBlock.tsx']) {
      expect(f(p).match(/<img src="\/brand\/social\/whatsapp\.png"[^>]*\/>/)?.[0] ?? '', p).toMatch(/loading="lazy"/);
    }
  });
  it('REQ-1564: en /tours solo la primera tarjeta va con prioridad (en celular la 2.ª cae bajo el pliegue)', () => {
    expect(f('src/components/trips/OwnTripsInTours.tsx')).toMatch(/priority=\{i < 1\}/);
    expect(f('src/components/tours/ToursPageClient.tsx')).toMatch(/priority=\{i < 1 && /);
  });
  it('REQ-1564: la foto principal de la galería del viaje carga en lazy (en celular queda bajo el título)', () => {
    expect(f('src/components/trips/TripGallery.tsx')).toMatch(/\{\.\.\.imgLoading\(false\)\}/);
  });
});
