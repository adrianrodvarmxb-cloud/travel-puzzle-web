/**
 * REQ-10817, REQ-10818, REQ-10819 · Ficha única, ola 7, bloques 7 «Lo más destacado» (solo si el proveedor lo trae),
 * 8 «Descripción» (texto del proveedor saneado; FREETOUR sin reescribir: solo se sanea, nunca se cambia el texto) y
 * 9 «Itinerario» (por día en circuitos). Sin dato, lista vacía o null: el bloque no sale. Puro.
 */
import type { FichaItineraryDay, FichaLang } from "./model";
import { sanitizeHtml } from "./text";

// REQ-10817
export function highlightItems(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}

/** El proveedor no cambia la regla: se sanea igual para todos y el texto no se reescribe (FREETOUR incluido). */
// REQ-10818
export function descriptionHtml(html: string | null, _provider: string): string | null {
  return sanitizeHtml(html);
}

const DAY: Record<FichaLang, string> = { es: "Día", en: "Day", pt: "Dia", fr: "Jour", de: "Tag", it: "Giorno" };
export interface ItineraryDayView { day: number; label: string; title: string | null; text: string }

// REQ-10819
export function itineraryDays(days: FichaItineraryDay[], lang: FichaLang): ItineraryDayView[] {
  const word = DAY[lang] ?? DAY.es;
  return days
    .filter((d) => d.text.trim() !== "")
    .sort((a, b) => a.day - b.day)
    .map((d) => ({ day: d.day, label: `${word} ${d.day}`, title: d.title?.trim() || null, text: d.text.trim() }));
}

const HEADINGS: Record<"destacado" | "descripcion" | "itinerario", Record<FichaLang, string>> = {
  destacado: { es: "Lo más destacado", en: "Highlights", pt: "Destaques", fr: "Points forts", de: "Highlights", it: "Punti salienti" },
  descripcion: { es: "Descripción", en: "Description", pt: "Descrição", fr: "Description", de: "Beschreibung", it: "Descrizione" },
  itinerario: { es: "Itinerario", en: "Itinerary", pt: "Itinerário", fr: "Itinéraire", de: "Reiseverlauf", it: "Itinerario" },
};

/** Título de cada bloque en el idioma del sitio. */
// REQ-10817 REQ-10818 REQ-10819
export const contentHeading = (block: keyof typeof HEADINGS, lang: FichaLang): string => HEADINGS[block][lang] ?? HEADINGS[block].es;
