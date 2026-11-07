/** Idiomas del sitio (Gate 3, 6 nov 2026). Puro. Español sin prefijo; los demás con /{código}. */
import type { SupportedLanguage } from "@/types";

// REQ-651
export const LOCALES = ["es", "en", "pt", "fr", "it", "de"] as const satisfies readonly SupportedLanguage[];
export const DEFAULT_LOCALE: SupportedLanguage = "es";
/** Encabezado interno que pone el middleware con el idioma de la URL; el que llegue desde fuera se borra (REQ-653). */
export const LOCALE_HEADER = "x-tp-lang";

export function isLocale(v: unknown): v is SupportedLanguage {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

const OG: Record<SupportedLanguage, string> = { es: "es_MX", en: "en_US", pt: "pt_BR", fr: "fr_FR", it: "it_IT", de: "de_DE" };
// REQ-664
export const ogLocale = (lang: SupportedLanguage): string => OG[lang];

/** Nombre de cada idioma en su propio idioma (selector y aviso). */
export const LOCALE_NAME: Record<SupportedLanguage, string> = { es: "español", en: "English", pt: "português", fr: "français", it: "italiano", de: "Deutsch" };

// REQ-664: <html lang> = idioma de la URL solo en rutas en alcance con la bandera (locked); si no, español como hoy.
export const htmlLang = (route: { lang: SupportedLanguage; locked: boolean } | null): SupportedLanguage => (route?.locked ? route.lang : DEFAULT_LOCALE);
