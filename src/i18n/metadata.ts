/**
 * REQ-660 REQ-661 REQ-664 REQ-670 (Gate 3): metadatos por idioma de home, /tours y /traslados. I/O: lee la bandera y
 * el idioma de la URL. Sin LOCALE_URLS_ENABLED (o fuera de alcance) devuelve null y la página queda como hoy.
 */
import type { Metadata } from "next";
import type { SupportedLanguage } from "@/types";
import { routeLanguageState } from "./server";
import { localeUrlsEnabled } from "./lib/flags";
import { hubAlternates } from "./lib/alternates";
import { ogLocale } from "./lib/locales";

import { SITE_URL_DEFAULT } from "@/destinations/load";

const site = () => process.env.SITE_URL || SITE_URL_DEFAULT;

export async function hubLocaleMetadata(path: string, o: { filtered?: boolean } = {}): Promise<{ lang: SupportedLanguage; meta: Metadata } | null> {
  if (!localeUrlsEnabled(process.env as Record<string, string | undefined>)) return null;
  const s = await routeLanguageState();
  if (!s.locked) return null;
  const a = hubAlternates({ siteUrl: site(), path, lang: s.lang, filtered: o.filtered });
  return {
    lang: s.lang,
    meta: {
      alternates: { canonical: a.canonical, ...(a.languages ? { languages: a.languages } : {}) },
      ...(a.index ? {} : { robots: { index: false, follow: true } }),
      openGraph: { locale: ogLocale(s.lang), url: a.canonical },
    },
  };
}
