/**
 * Raíz de I/O del idioma en el middleware (Gate 3). La decisión es pura (lib/path.ts); aquí solo se arma la respuesta.
 * Con LOCALE_URLS_ENABLED apagada no hace nada: `finish()` regresa null y el middleware sigue como hoy (REQ-650).
 */
import { NextResponse, type NextRequest } from "next/server";
import type { SupportedLanguage } from "@/types";
import { localeUrlsEnabled } from "./lib/flags";
import { LOCALE_HEADER } from "./lib/locales";
import { localeRouting, localizePath } from "./lib/path";

export interface LocaleStep {
  /** 301 de /es/... o 302 de /{lang}/{fuera de alcance}; si no es null, el middleware lo regresa tal cual. */
  redirect: NextResponse | null;
  /** Ruta sin prefijo: la que ven los pasos siguientes (301 de transporte, destinos, auth). */
  pathname: string;
  /** Idioma de la URL en rutas en alcance; null si no aplica. */
  lang: SupportedLanguage | null;
  /** Encabezados de la petición para los rewrites (con x-tp-lang); null con la bandera apagada. */
  headers: Headers | null;
  /** REQ-658: las URLs a las que redirigen los pasos siguientes, con el mismo prefijo. */
  localize: (path: string) => string;
  /** Respuesta final cuando ningún paso respondió: rewrite (con prefijo) o next, con los encabezados. */
  finish: () => NextResponse | null;
}

// REQ-650 REQ-651 REQ-652 REQ-653 REQ-658
export function localeStep(request: NextRequest, env: Record<string, string | undefined>): LocaleStep {
  const { pathname, searchParams } = request.nextUrl;
  const enabled = localeUrlsEnabled(env);
  const d = localeRouting(pathname, searchParams, enabled);
  if (!enabled) return { redirect: null, pathname, lang: null, headers: null, localize: (p) => p, finish: () => null };
  if (d.type === "redirect") {
    return { redirect: NextResponse.redirect(new URL(d.location, request.url), d.status), pathname, lang: null, headers: null, localize: (p) => p, finish: () => null };
  }
  const headers = new Headers(request.headers);
  headers.delete(LOCALE_HEADER);
  const lang = d.type === "rewrite" ? d.lang : null;
  if (lang) headers.set(LOCALE_HEADER, lang);
  const path = d.type === "rewrite" ? d.path : pathname;
  return {
    redirect: null,
    pathname: path,
    lang,
    headers,
    localize: (p) => (lang ? localizePath(p, lang) : p),
    finish: () => {
      if (path === pathname) return NextResponse.next({ request: { headers } });
      const url = request.nextUrl.clone();
      url.pathname = path;
      return NextResponse.rewrite(url, { request: { headers } });
    },
  };
}
