/**
 * Idioma de la petición en servidor (Gate 3). Con LOCALE_URLS_ENABLED y una ruta en alcance, el middleware puso el idioma
 * de la URL en x-tp-lang y ese manda (REQ-653). En cualquier otro caso, la cookie de siempre (REQ-650, REQ-659).
 */
import { headers } from "next/headers";
import type { SupportedLanguage } from "@/types";
import { getPreferredLanguage } from "@/lib/utils/cookies";
import { localeUrlsEnabled } from "./lib/flags";
import { isLocale, LOCALE_HEADER } from "./lib/locales";

export interface RouteLanguageState {
  lang: SupportedLanguage;
  /** true = el idioma sale de la URL: el cliente no lo cambia solo (REQ-654) y los enlaces llevan el prefijo (REQ-655). */
  locked: boolean;
}

// REQ-650 REQ-653 REQ-659
export async function routeLanguageState(): Promise<RouteLanguageState> {
  if (localeUrlsEnabled(process.env as Record<string, string | undefined>)) {
    const h = (await headers()).get(LOCALE_HEADER);
    if (isLocale(h)) return { lang: h, locked: true };
  }
  return { lang: await getPreferredLanguage(), locked: false };
}

/** Reemplazo de `getPreferredLanguage()` en páginas: igual que hoy sin la bandera. */
export async function getRouteLanguage(): Promise<SupportedLanguage> {
  return (await routeLanguageState()).lang;
}
