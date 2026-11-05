/**
 * REQ-042: galería de la ficha en mosaico, como "Destinos" del home. Se acomoda al número de fotos
 * (1 a lo ancho, 2 mitad y mitad, 3+ una grande y hasta 4 chicas) sin huecos ni fotos de relleno. Puro.
 */
export const MOSAIC_MAX = 5;

export interface MosaicLayout { shown: number; extra: number; grid: string; tiles: string[] }

const SMALL = "aspect-[4/3] md:aspect-auto";
const SMALL_WIDE = "col-span-2 aspect-[16/9] md:aspect-auto"; // llena la fila cuando sobran columnas
const SMALL_HALF = "aspect-[4/3] md:col-span-2 md:aspect-auto"; // 2 chicas: cada una ocupa media columna derecha

export function mosaicLayout(count: number): MosaicLayout {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return { shown: 0, extra: 0, grid: "", tiles: [] };
  const shown = Math.min(n, MOSAIC_MAX);
  const extra = n - shown;
  if (shown === 1) return { shown, extra, grid: "grid grid-cols-2", tiles: ["col-span-2 aspect-[16/9]"] };
  if (shown === 2) return { shown, extra, grid: "grid grid-cols-2 gap-2 md:gap-3", tiles: ["aspect-[4/3]", "aspect-[4/3]"] };
  const smalls = shown - 1;
  const tiles = ["col-span-2 aspect-[16/9] md:row-span-2 md:aspect-auto"];
  for (let k = 0; k < smalls; k++) {
    if (smalls === 2) tiles.push(SMALL_HALF);
    else if (smalls === 3 && k === 2) tiles.push(SMALL_WIDE);
    else tiles.push(SMALL);
  }
  return { shown, extra, grid: "grid grid-cols-2 gap-2 md:grid-cols-4 md:grid-rows-[220px_220px] md:gap-3", tiles };
}
