// REQ-1563 / REQ-1564: reglas puras de carga de imágenes.
import { PROVIDER_IMAGE_ORIGIN } from '@/freetour/lib/image-origin';

/**
 * Gate B (PO, 11 nov 2026): fotos redimensionadas con Cloudflare Image Transformations.
 * Encendida el 11 nov 2026: Transformations habilitado en la zona travelpuzzle.com.mx con orígenes
 * permitidos (la zona, www.freetour.com, images.pexels.com). Para apagar: volver a false (un PR).
 */
export const IMAGE_TRANSFORMS_ENABLED = true;

/**
 * Zona con Transformations. Las URLs son absolutas para que también funcionen en las versiones de
 * preview (*.workers.dev) y en local, donde /cdn-cgi/image no existe.
 */
export const TRANSFORM_ZONE = 'https://travelpuzzle.com.mx';

/** Orígenes remotos que Transformations puede leer (los mismos que `images.remotePatterns`). */
const REMOTE_OK = [PROVIDER_IMAGE_ORIGIN, 'https://images.pexels.com/'];
const RASTER = /\.(jpe?g|png|webp)(\?|$)/i;

export type ImgLoading = { loading: 'eager' | 'lazy'; decoding: 'async'; fetchPriority?: 'high' };

/** REQ-1564: arriba del pliegue = eager + prioridad alta; el resto = lazy. */
export function imgLoading(aboveTheFold: boolean): ImgLoading {
  return aboveTheFold ? { loading: 'eager', decoding: 'async', fetchPriority: 'high' } : { loading: 'lazy', decoding: 'async' };
}

/** REQ-1563: URL redimensionada por Cloudflare (`/cdn-cgi/image/...`); sin bandera, la misma URL. */
export function transformedSrc(src: string, width: number, enabled: boolean = IMAGE_TRANSFORMS_ENABLED): string {
  if (!enabled || !src || !RASTER.test(src)) return src;
  const local = src.startsWith('/') && !src.startsWith('//');
  if (!local && !REMOTE_OK.some((o) => src.startsWith(o))) return src;
  const opts = `width=${width},quality=75,format=auto,fit=scale-down`;
  return `${TRANSFORM_ZONE}/cdn-cgi/image/${opts}${local ? src : `/${src}`}`;
}

/**
 * REQ-1564: índices del carrusel del hero que se montan. Solo la foto visible y la que se pide;
 * la siguiente se descarga al llegar su turno, no en la carga inicial.
 */
export function heroSlidesToMount(total: number, shown: number, wanted: number): number[] {
  if (total < 1) return [];
  return [...new Set([shown % total, wanted % total])].sort((a, b) => a - b);
}

/**
 * REQ-1563: `srcset` con un candidato por ancho (descriptor `w`), para que el navegador baje solo el
 * tamaño que necesita. Sin bandera o con una imagen no transformable devuelve undefined (queda `src`).
 */
export function transformedSrcSet(src: string, widths: number[], enabled: boolean = IMAGE_TRANSFORMS_ENABLED): string | undefined {
  if (!enabled) return undefined;
  const parts = widths.map((w) => ({ w, url: transformedSrc(src, w, true) }));
  if (parts.some((p) => p.url === src)) return undefined;
  return parts.map((p) => `${p.url} ${p.w}w`).join(', ');
}
