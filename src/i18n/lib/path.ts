/**
 * Rutas con idioma (Gate 3). Puro, sin I/O: lo usan el middleware, el servidor y los enlaces del cliente.
 * Español sin prefijo; /en, /pt, /fr, /it, /de delante de la ruta. Mismo slug en todos los idiomas (plan §3.2).
 */
import type { SupportedLanguage } from "@/types";
import { DEFAULT_LOCALE, isLocale } from "./locales";

export interface SplitPath { lang: SupportedLanguage; rest: string; prefix: SupportedLanguage | null }

// REQ-651
export function splitLocale(pathname: string): SplitPath {
  const m = /^\/([a-z]{2})(?=\/|$)(.*)$/.exec(pathname);
  if (m && isLocale(m[1])) return { lang: m[1], rest: m[2] && m[2] !== "/" ? m[2] : "/", prefix: m[1] };
  return { lang: DEFAULT_LOCALE, rest: pathname || "/", prefix: null };
}

/**
 * REQ-651 / REQ-659: rutas con versión por idioma. Home, /destinos (hub, país, ciudad, ficha), /viajes/{destino}/{slug},
 * /tours (y /tours/{id}, que el middleware de destinos manda con 301 a la ficha) y /traslados.
 */
const SCOPE: readonly RegExp[] = [
  /^\/$/,
  /^\/destinos(\/[^/]+){0,3}$/,
  /^\/viajes\/(?!gracias$)[^/]+\/[^/]+$/,
  /^\/tours(\/[^/]+)?$/,
  /^\/traslados$/,
];
export function inScope(path: string): boolean {
  const p = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return SCOPE.some((re) => re.test(p));
}

// REQ-655: el mismo enlace en otro idioma. Externos, anclas, mailto y rutas fuera de alcance no cambian.
export function localizePath(href: string, lang: SupportedLanguage): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);
  const tail = cut === -1 ? "" : href.slice(cut);
  const { rest } = splitLocale(path);
  if (!inScope(rest)) return href;
  if (lang === DEFAULT_LOCALE) return `${rest}${tail}`;
  return `/${lang}${rest === "/" ? "" : rest}${tail}`;
}

export type LocaleDecision =
  | { type: "none" }
  | { type: "rewrite"; lang: SupportedLanguage; path: string }
  | { type: "redirect"; status: 301 | 302; location: string };

/**
 * REQ-650…653: qué hace el middleware con una ruta. Nunca decide por cookie ni por Accept-Language (REQ-657):
 * solo por la URL, así un bot ve siempre lo mismo.
 */
export function localeRouting(pathname: string, search: URLSearchParams, enabled: boolean): LocaleDecision {
  if (!enabled) return { type: "none" };
  const { lang, rest, prefix } = splitLocale(pathname);
  const qs = search.toString();
  const withQs = (p: string) => (qs ? `${p}?${qs}` : p);
  if (prefix === DEFAULT_LOCALE) return { type: "redirect", status: 301, location: withQs(rest) };
  if (!inScope(rest)) return prefix ? { type: "redirect", status: 302, location: withQs(rest) } : { type: "none" };
  return { type: "rewrite", lang, path: rest };
}

// REQ-656: a dónde navega el selector. null = no navegar (bandera apagada o mismo idioma).
export function languageSwitchUrl(currentUrl: string, target: SupportedLanguage, o: { locked: boolean; current: SupportedLanguage }): string | null {
  if (!o.locked || target === o.current) return null;
  return localizePath(currentUrl, target);
}
