/**
 * REQ-10781 · Decisión 1 (REQ-10580): la ficha vive en «Experiencias» o en «Traslados» según el tipo de producto, no
 * según el proveedor. Big Bus (hop-on hop-off, formato transporte) y todo traslado de cualquier proveedor caen en
 * Traslados. Puro.
 */
import type { FichaSection } from "./model";

/** Formatos de la taxonomía que son transporte (`src/taxonomy/lib/types.ts`). */
export const TRANSFER_FORMATS: ReadonlySet<string> = new Set(["transporte", "traslado"]);

// REQ-10781
export function sectionFor(format: string | null | undefined): FichaSection {
  return format && TRANSFER_FORMATS.has(format.trim().toLowerCase()) ? "traslados" : "experiencias";
}
