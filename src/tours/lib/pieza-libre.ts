/**
 * Nombre de la categoría de los free tours (decisión del PO, 6 nov 2026, 10:45): «Pieza libre».
 * Solo cambian el chip de filtros de /tours y la insignia azul sobre la foto; el precio verde «Free tour»
 * de las tarjetas se queda (corrección del PO, 10:46). EN «Free tour», pendiente de firma.
 * No reemplaza el título real del tour (FREETOUR C4) ni la colección «La Primera Pieza». Puro.
 */
export const PIEZA_LIBRE_LABEL = "Pieza libre";

// REQ-480
export function freeBadgeLabel(lang: string): string {
  return lang === "es" ? PIEZA_LIBRE_LABEL : "Free tour";
}
