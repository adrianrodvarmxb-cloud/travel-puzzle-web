/**
 * Copy genérico del catálogo (decisión del PO, 6 nov 2026): donde «tour/tours» significa «lo que vendemos» se dice
 * «experiencia/experiencias». «Free tour» (tipo de producto) y los títulos reales (FREETOUR C4) no cambian.
 * REQ-174 (G1 firmado, 6 nov 2026: «Experiencias» es el paraguas; «Tours» sigue como formato): la etiqueta del menú, el footer y el H1/title de /tours también dicen «Experiencias»;
 * la URL sigue siendo /tours. Puro.
 */
import { hubTitle } from "@/seo/lib/titles";

const NAME: Record<string, string> = { es: "Experiencias", en: "Experiences", pt: "Experiências", de: "Erlebnisse", fr: "Expériences", it: "Esperienze" };

// REQ-174
export function catalogName(lang: string): string {
  return NAME[lang] ?? NAME.en;
}

// REQ-174: title de /tours = nombre del menú + marca (skill sitelinks-google).
export function catalogTitle(lang: string): string {
  return hubTitle(catalogName(lang));
}

// REQ-173: «1 experiencia» / «N experiencias»; recibe el número ya formateado en el servidor.
export function experiencesCount(n: string, lang: string): string {
  if (lang === "es") return n === "1" ? "1 experiencia" : `${n} experiencias`;
  return n === "1" ? "1 experience" : `${n} experiences`;
}
