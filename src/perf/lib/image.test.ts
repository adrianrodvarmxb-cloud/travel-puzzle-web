import { describe, it, expect } from 'vitest';
import { imgLoading, transformedSrc, heroSlidesToMount } from './image';
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
    expect(transformedSrc('/api/viajes/foto/trips/1-a.jpg', 640, true)).toBe('/cdn-cgi/image/width=640,quality=75,format=auto,fit=scale-down/api/viajes/foto/trips/1-a.jpg');
    expect(transformedSrc(`${PROVIDER_IMAGE_ORIGIN}images/tours/1/x.jpg`, 480, true)).toBe(`/cdn-cgi/image/width=480,quality=75,format=auto,fit=scale-down/${PROVIDER_IMAGE_ORIGIN}images/tours/1/x.jpg`);
  });

  it('REQ-1563: no transforma GIF/SVG, data: ni orígenes no permitidos', () => {
    for (const s of ['/brand/logo.gif', '/x.svg', 'data:image/png;base64,AA', 'https://evil.example/x.jpg', '']) expect(transformedSrc(s, 640, true)).toBe(s);
  });
});
