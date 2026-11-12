// REQ-1564: qué imágenes descargadas en la carga inicial quedan fuera de la pantalla (lógica pura).
export type LoadedImage = { src: string; top: number; height: number; loaded: boolean; lazy?: boolean };

/**
 * Imágenes sin `loading="lazy"` ya descargadas cuyo borde superior queda bajo el pliegue. Las lazy que el
 * navegador adelanta por estar cerca del pliegue son decisión del navegador (mismo criterio que Lighthouse).
 */
export function offscreenLoaded(images: LoadedImage[], viewportHeight: number): LoadedImage[] {
  return images.filter((i) => i.loaded && !i.lazy && i.height > 0 && i.top >= viewportHeight);
}
