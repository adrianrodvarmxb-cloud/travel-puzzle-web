/**
 * REQ-1256 (D21): los tipos principales de /tours (chips y filtro «Tipo de experiencia») salen del diccionario:
 * formatos `activo` de la sección Experiencias, con su nombre corto (tarjeta y chips) y largo (filtro), en `orden_chip`.
 * Puro. Se llama en el servidor (el diccionario no viaja al navegador); al cliente solo llega esta lista.
 */
import type { Dictionary, TerminoFormato } from "../schemas/dictionary";

export interface FormatDef { slug: string; corto: { es: string; en: string }; largo: { es: string; en: string } }

// REQ-1256
export function formatDefs(dict: Dictionary): FormatDef[] {
  return dict.terminos
    .filter((t): t is TerminoFormato => t.eje === "formato" && t.estado === "activo" && t.seccion === "experiencias")
    .sort((a, b) => (a.orden_chip ?? 1e3) - (b.orden_chip ?? 1e3) || (a.precedencia ?? 1e3) - (b.precedencia ?? 1e3) || a.slug.localeCompare(b.slug))
    .map((t) => ({ slug: t.slug, corto: { es: t.etiqueta_corta_es ?? t.termino_es, en: t.etiqueta_corta_en ?? t.termino_en }, largo: { es: t.termino_es, en: t.termino_en } }));
}

/** REQ-1256: nombre del idioma (pt/de/fr/it salen en inglés, como el resto del filtro). */
export const defLabel = (d: { es: string; en: string }, lang: string) => (lang === "es" ? d.es : d.en);
