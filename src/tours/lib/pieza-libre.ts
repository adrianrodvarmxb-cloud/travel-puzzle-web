/**
 * Nombre de la categoría de los free tours (decisión del PO, 6 nov 2026, 10:45): «Pieza libre».
 * Solo cambian el chip de filtros de /tours y la insignia azul sobre la foto; el precio verde «Free tour»
 * de las tarjetas se queda (corrección del PO, 10:46).
 * REQ-1103 (PO, 7 nov 2026, 06:06; reemplaza «EN Free tour»): en inglés (y pt/de/fr/it) la categoría es «Free Puzzle».
 * No reemplaza el título real del tour (FREETOUR C4) ni la colección «La Primera Pieza». Puro.
 */
export const PIEZA_LIBRE_LABEL = "Pieza libre";
/** REQ-1103 */
export const FREE_PUZZLE_LABEL = "Free Puzzle";

// REQ-480 REQ-1103
export function freeBadgeLabel(lang: string): string {
  return lang === "es" ? PIEZA_LIBRE_LABEL : FREE_PUZZLE_LABEL;
}
