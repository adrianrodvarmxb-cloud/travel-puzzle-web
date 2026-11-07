/**
 * REQ-657: la preferencia de idioma (elegida antes, cookie o navegador) ya no cambia el contenido de una URL con idioma;
 * solo sugiere la otra versión con un aviso. Puro: el componente le pasa lo que lee del navegador después de montar.
 */
import type { SupportedLanguage } from "@/types";
import { isLocale, LOCALE_NAME } from "./locales";

export interface SuggestInput {
  routeLang: SupportedLanguage;
  stored: string | null;
  cookie: string | null;
  browser: string | null;
  dismissed?: boolean;
}

// REQ-657
export function suggestLanguage(i: SuggestInput): SupportedLanguage | null {
  if (i.dismissed) return null;
  const browser = i.browser ? i.browser.split("-")[0].toLowerCase() : null;
  const pref = [i.stored, i.cookie].find(isLocale) ?? (isLocale(browser) ? browser : null);
  return pref && pref !== i.routeLang ? pref : null;
}

const COPY: Record<SupportedLanguage, { text: string; cta: string; close: string }> = {
  es: { text: "Esta página también está en español.", cta: "Ver en español", close: "Cerrar" },
  en: { text: `This page is also available in ${LOCALE_NAME.en}.`, cta: "View in English", close: "Close" },
  pt: { text: "Esta página também está disponível em português.", cta: "Ver em português", close: "Fechar" },
  fr: { text: "Cette page est aussi disponible en français.", cta: "Voir en français", close: "Fermer" },
  it: { text: "Questa pagina è disponibile anche in italiano.", cta: "Vedi in italiano", close: "Chiudi" },
  de: { text: "Diese Seite gibt es auch auf Deutsch.", cta: "Auf Deutsch ansehen", close: "Schließen" },
};
/** El aviso va en el idioma sugerido: lo lee quien lo prefiere. */
export const suggestionCopy = (lang: SupportedLanguage) => COPY[lang];
