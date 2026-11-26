/**
 * REQ-10809 · Ficha única, ola 7, bloque 2 «Galería» (plan §3: 1 grande + 4; con una foto, foto única). Puro: recibe
 * solo las fotos del modelo; descarta URLs vacías y repetidas. Sin fotos, el bloque no sale (REQ-10780).
 */
import type { FichaMedia } from "./model";

export const GALLERY_SIDE = 4;

/** REQ-10896: celda del mosaico (en computadora): cuántas columnas y filas ocupa cada foto lateral. */
export interface GalleryCell { colSpan: 1 | 2; rowSpan: 1 | 2 }

export type GalleryLayout =
  | { kind: "none" }
  | { kind: "single"; main: FichaMedia }
  | { kind: "mosaic"; main: FichaMedia; side: FichaMedia[]; more: number; cells: GalleryCell[] };

/**
 * REQ-10896 (comparativo con referentes, punto 1; decisión 1 del PO del 26-11-2026): la rejilla se adapta a 1, 2, 3, 4
 * o 5 fotos sin huecos. La grande ocupa 2×2; a su lado hay 2 columnas × 2 filas:
 * - 1 lateral: ocupa las 2 columnas y las 2 filas; 2 laterales: una fila cada una, a lo ancho;
 * - 3 laterales: la primera a lo ancho y las otras dos abajo, una por columna (hoy quedaba un hueco abajo a la derecha);
 * - 4 o más: 2×2. Puro.
 */
// REQ-10896
export function galleryCells(sideCount: number): GalleryCell[] {
  if (sideCount <= 0) return [];
  if (sideCount === 1) return [{ colSpan: 2, rowSpan: 2 }];
  if (sideCount === 2) return [{ colSpan: 2, rowSpan: 1 }, { colSpan: 2, rowSpan: 1 }];
  if (sideCount === 3) return [{ colSpan: 2, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }];
  return Array.from({ length: Math.min(sideCount, GALLERY_SIDE) }, () => ({ colSpan: 1, rowSpan: 1 }));
}

// REQ-10809
export function galleryLayout(media: FichaMedia[]): GalleryLayout {
  const seen = new Set<string>();
  const clean = media.filter((m) => {
    const url = m.url.trim();
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
  const [main, ...rest] = clean;
  if (!main) return { kind: "none" };
  if (rest.length === 0) return { kind: "single", main };
  const side = rest.slice(0, GALLERY_SIDE);
  return { kind: "mosaic", main, side, more: rest.length - side.length, cells: galleryCells(side.length) }; // REQ-10896
}
