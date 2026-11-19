/**
 * REQ-10809 · Ficha única, ola 7, bloque 2 «Galería» (plan §3: 1 grande + 4; con una foto, foto única). Puro: recibe
 * solo las fotos del modelo; descarta URLs vacías y repetidas. Sin fotos, el bloque no sale (REQ-10780).
 */
import type { FichaMedia } from "./model";

export const GALLERY_SIDE = 4;

export type GalleryLayout =
  | { kind: "none" }
  | { kind: "single"; main: FichaMedia }
  | { kind: "mosaic"; main: FichaMedia; side: FichaMedia[]; more: number };

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
  return { kind: "mosaic", main, side, more: rest.length - side.length };
}
