import type { SupportedLanguage } from "@/types";
import type { Dictionary } from "@/i18n/lib/dictionary";
import { es } from "@/lib/translations/es";

/**
 * REQ-10869: carga bajo demanda del diccionario de un idioma (un chunk por idioma).
 * Español viaja siempre (es el idioma por omisión del servidor); los demás solo cuando se usan.
 */
const LOADERS: Record<Exclude<SupportedLanguage, "es">, () => Promise<Dictionary>> = {
  en: () => import("@/lib/translations/en").then((m) => m.en),
  pt: () => import("@/lib/translations/pt").then((m) => m.pt),
  de: () => import("@/lib/translations/de").then((m) => m.de),
  fr: () => import("@/lib/translations/fr").then((m) => m.fr),
  it: () => import("@/lib/translations/it").then((m) => m.it),
};

// REQ-10869
export function loadDictionary(lang: SupportedLanguage): Promise<Dictionary> {
  if (lang === "es") return Promise.resolve(es);
  return LOADERS[lang]();
}

export const esDictionary: Dictionary = es;
