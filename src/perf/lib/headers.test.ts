import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHeadersFile, cacheControlFor } from './headers';

const file = readFileSync(join(process.cwd(), 'public/_headers'), 'utf8');
const rules = parseHeadersFile(file);

describe('REQ-1560: caché del navegador para estáticos (public/_headers)', () => {
  it('REQ-1560: /_next/static/* (archivos con hash) se guarda 1 año e immutable', () => {
    const cc = cacheControlFor(rules, '/_next/static/chunks/abc123.js');
    expect(cc).toContain('max-age=31536000');
    expect(cc).toContain('immutable');
  });

  it('REQ-1560: imágenes de marca y del home se guardan 30 días con revalidación en segundo plano', () => {
    for (const p of ['/brand/logo-animado-128.webp', '/home/hero/singapur.webp', '/logo-travel.gif']) {
      const cc = cacheControlFor(rules, p);
      expect(cc, p).toContain('max-age=2592000');
      expect(cc, p).toContain('stale-while-revalidate');
    }
  });

  it('REQ-1560: el HTML y la API no reciben reglas de caché (siguen dinámicos)', () => {
    expect(cacheControlFor(rules, '/tours')).toBeNull();
    expect(cacheControlFor(rules, '/api/viajes/foto/trips/x.jpg')).toBeNull();
  });
});
