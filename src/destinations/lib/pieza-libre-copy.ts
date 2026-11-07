/**
 * REQ-271: la categoría de los free tours se llama «Pieza libre» en todo lo que la nombra (decisión del PO, 6 nov 2026).
 * Única excepción: el precio verde «Free tour» de las tarjetas (tours.free). EN «Free Puzzle» (REQ-1103, reemplaza «Free tour»).
 * No reemplaza el título real del tour (FREETOUR C4) ni la colección «La Primera Pieza». Puro.
 */
import { PRIMERA_PIEZA_LABEL } from "@/tours/lib/menu";
import { FREE_PUZZLE_LABEL } from "@/tours/lib/pieza-libre";

const PIEZA_LIBRE = "Pieza libre";

/** Título de la sección de la ciudad: «Pieza libre (La Primera Pieza)». */
export const freeSectionTitle = (): string => `${PIEZA_LIBRE} (${PRIMERA_PIEZA_LABEL})`;

/** Intro de la ciudad. */
export function cityFreeIntro(city: string, free: number, tours: number): string {
  return `${free} en ${PIEZA_LIBRE} y ${tours} ${tours === 1 ? "tour" : "tours"} con guías locales en ${city}.`;
}

/** Título de respaldo (asunto y calendario de los correos) cuando no se encontró el tour. */
export function fallbackTourTitle(externalId: number | null | undefined, lang: string): string {
  // REQ-1103
  return `${lang === "es" ? PIEZA_LIBRE : FREE_PUZZLE_LABEL} ${externalId ?? ""}`.trim();
}
