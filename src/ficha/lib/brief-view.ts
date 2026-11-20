/**
 * REQ-10816 · Ficha única, ola 7, bloque 6 «En breve» (plan §3): oculto en FREETOUR (REQ-570: su descripción no se
 * enriquece) y sin nombre del operador; si el texto lo menciona, el bloque no sale (no se reescribe a mano). Vacío,
 * no sale. Puro.
 */
import { FREETOUR_PROVIDER } from "./blocks";

export interface BriefInput { brief: string | null; provider: string; operator: string | null }

// REQ-10816
export function briefText({ brief, provider, operator }: BriefInput): string | null {
  if (provider === FREETOUR_PROVIDER) return null;
  const text = (brief ?? "").trim();
  if (!text) return null;
  const op = (operator ?? "").trim().toLowerCase();
  if (op && text.toLowerCase().includes(op)) return null;
  return text;
}

const HEADING: Record<string, string> = { es: "En breve", en: "At a glance", pt: "Em resumo", fr: "En bref", de: "Auf einen Blick", it: "In breve" };

/** Título del bloque en el idioma del sitio. */
// REQ-10816
export const briefHeading = (lang: string): string => HEADING[lang] ?? HEADING.es;
