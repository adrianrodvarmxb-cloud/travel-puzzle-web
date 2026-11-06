/**
 * Copy genérico del catálogo (decisión del PO, 6 nov 2026): donde «tour/tours» significa «lo que vendemos» se dice
 * «experiencia/experiencias». «Free tour» (tipo de producto) y los títulos reales (FREETOUR C4) no cambian.
 * La etiqueta del menú y el H1/title de /tours van aparte (REQ-174, en espera). Puro.
 */

// REQ-173: «1 experiencia» / «N experiencias»; recibe el número ya formateado en el servidor.
export function experiencesCount(n: string, lang: string): string {
  if (lang === "es") return n === "1" ? "1 experiencia" : `${n} experiencias`;
  return n === "1" ? "1 experience" : `${n} experiences`;
}
