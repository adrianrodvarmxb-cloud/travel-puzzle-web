/**
 * hreflang + canonical por idioma (Gate 3, Ola 2). Puro.
 * - canonical: la URL de la página en SU idioma, nunca la de otro (REQ-661).
 * - hreflang: la misma serie en cada versión indexable (recíproco) + x-default = español (REQ-660).
 * - Una versión fuera de `langs` (sin texto propio) o fuera de INDEXABLE_LOCALES: noindex y sin hreflang (REQ-662).
 */
import type { SupportedLanguage } from "@/types";
import { canonicalUrl } from "@/seo/lib/hub";
import { LOCALES } from "./locales";
import { localizePath } from "./path";

/**
 * REQ-662 (plan §3.6): idiomas con las plantillas del servidor traducidas (titles, H1, avisos, FAQ). pt/fr/it/de tienen
 * ruta y menú traducido, pero sus textos del servidor salen en inglés: van con noindex hasta traducirlos aquí.
 */
export const INDEXABLE_LOCALES: readonly SupportedLanguage[] = ["es", "en"];

// REQ-661
export function localizedUrl(siteUrl: string, path: string, lang: SupportedLanguage): string {
  return canonicalUrl(siteUrl, localizePath(path.split(/[?#]/)[0] || "/", lang));
}

export interface LocaleMeta { canonical: string; index: boolean; languages: Record<string, string> | null }

// REQ-660 REQ-661 REQ-662
export function localeAlternates({ siteUrl, path, lang, langs }: { siteUrl: string; path: string; lang: SupportedLanguage; langs: readonly SupportedLanguage[] }): LocaleMeta {
  const indexable = LOCALES.filter((l) => langs.includes(l) && INDEXABLE_LOCALES.includes(l));
  const canonical = localizedUrl(siteUrl, path, lang);
  if (!indexable.includes(lang)) return { canonical, index: false, languages: null };
  const languages: Record<string, string> = Object.fromEntries(indexable.map((l) => [l, localizedUrl(siteUrl, path, l)]));
  if (languages.es) languages["x-default"] = languages.es;
  return { canonical, index: true, languages };
}

/**
 * REQ-660 REQ-661 REQ-670: alternates de las páginas que existen en todos los idiomas (home, /tours, /traslados).
 * Con un filtro: noindex, canonical a la página sin filtro DEL MISMO idioma y sin hreflang.
 */
export function hubAlternates({ siteUrl, path, lang, filtered = false }: { siteUrl: string; path: string; lang: SupportedLanguage; filtered?: boolean }): { canonical: string; languages?: Record<string, string>; index: boolean } {
  if (filtered) return { canonical: localizedUrl(siteUrl, path, lang), index: false };
  const a = localeAlternates({ siteUrl, path, lang, langs: LOCALES });
  return { canonical: a.canonical, index: a.index, ...(a.languages ? { languages: a.languages } : {}) };
}
