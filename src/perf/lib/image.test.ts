import { describe, it, expect } from 'vitest';
import { imgLoading, transformedSrc, transformedSrcSet, heroSlidesToMount, IMAGE_TRANSFORMS_ENABLED, TRANSFORM_ZONE } from './image';
import { PROVIDER_IMAGE_ORIGIN } from '@/freetour/lib/image-origin';

describe('REQ-1564: carga de imágenes (lógica pura)', () => {
  it('REQ-1564: lo de arriba del pliegue va eager con prioridad alta; lo demás, lazy y asíncrono', () => {
    expect(imgLoading(true)).toEqual({ loading: 'eager', decoding: 'async', fetchPriority: 'high' });
    expect(imgLoading(false)).toEqual({ loading: 'lazy', decoding: 'async' });
  });

  it('REQ-1564: el hero monta solo la foto visible y la que se está pidiendo; al inicio, solo la primera', () => {
    expect(heroSlidesToMount(5, 0, 0)).toEqual([0]);
    expect(heroSlidesToMount(5, 0, 1)).toEqual([0, 1]);
    expect(heroSlidesToMount(5, 4, 0)).toEqual([0, 4]);
    expect(heroSlidesToMount(1, 0, 0)).toEqual([0]);
  });
});

describe('REQ-1563: fotos redimensionadas con Cloudflare Image Transformations (gate B, tras bandera)', () => {
  it('REQ-1563: con la bandera apagada la URL no cambia', () => {
    expect(transformedSrc('/api/viajes/foto/trips/1-a.jpg', 640, false)).toBe('/api/viajes/foto/trips/1-a.jpg');
  });

  it('REQ-1563: con la bandera encendida pide ancho, calidad y formato automático (WebP/AVIF)', () => {
    expect(transformedSrc('/api/viajes/foto/trips/1-a.jpg', 640, true)).toBe(`${TRANSFORM_ZONE}/cdn-cgi/image/width=640,quality=75,format=auto,fit=scale-down/api/viajes/foto/trips/1-a.jpg`);
    expect(transformedSrc(`${PROVIDER_IMAGE_ORIGIN}images/tours/1/x.jpg`, 480, true)).toBe(`${TRANSFORM_ZONE}/cdn-cgi/image/width=480,quality=75,format=auto,fit=scale-down/${PROVIDER_IMAGE_ORIGIN}images/tours/1/x.jpg`);
  });

  it('REQ-1563: no transforma GIF/SVG, data: ni orígenes no permitidos', () => {
    for (const s of ['/brand/logo.gif', '/x.svg', 'data:image/png;base64,AA', 'https://evil.example/x.jpg', '']) expect(transformedSrc(s, 640, true)).toBe(s);
  });
});

describe('REQ-1563: Image Transformations encendido (gate B; zona habilitada el 11 nov 2026)', () => {
  it('REQ-1563: la bandera está encendida y apunta a la zona de producción (también sirve en preview y local)', () => {
    expect(IMAGE_TRANSFORMS_ENABLED).toBe(true);
    expect(TRANSFORM_ZONE).toBe('https://travelpuzzle.com.mx');
    expect(transformedSrc('/api/viajes/foto/trips/1-a.jpg', 640)).toMatch(/^https:\/\/travelpuzzle\.com\.mx\/cdn-cgi\/image\/width=640,/);
  });
});

describe('REQ-1563: imágenes responsivas (srcset) con Transformations', () => {
  it('REQ-1563: arma un srcset con un ancho por candidato, en orden, con descriptor w', () => {
    const s = transformedSrcSet('/api/viajes/foto/trips/1-a.jpg', [320, 640], true);
    expect(s).toBe(`${TRANSFORM_ZONE}/cdn-cgi/image/width=320,quality=75,format=auto,fit=scale-down/api/viajes/foto/trips/1-a.jpg 320w, ${TRANSFORM_ZONE}/cdn-cgi/image/width=640,quality=75,format=auto,fit=scale-down/api/viajes/foto/trips/1-a.jpg 640w`);
  });
  it('REQ-1563: sin bandera, o si la imagen no se puede transformar, no hay srcset (el navegador usa src)', () => {
    expect(transformedSrcSet('/api/viajes/foto/trips/1-a.jpg', [320, 640], false)).toBeUndefined();
    expect(transformedSrcSet('/brand/logo.gif', [320, 640], true)).toBeUndefined();
    expect(transformedSrcSet('https://evil.example/x.jpg', [320], true)).toBeUndefined();
  });
});
