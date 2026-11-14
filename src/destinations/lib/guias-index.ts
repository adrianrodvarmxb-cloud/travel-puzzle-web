/**
 * REQ-3333 / REQ-3335: índice de las guías de ciudad (página /guias y columna «Guías» del pie). Puro.
 * Recibe las guías y el nombre del país por parámetro (DIP), así una guía nueva entra sola.
 */
import { guideCityPath, guideIn, guideLangs, type CityGuide, type GuideLang } from "./guia";
import { localeAlternates } from "@/i18n/lib/alternates";
import type { SupportedLanguage } from "@/types";

export interface GuideCityLink { ciudad: string; nombre: string; titulo: string; href: string }
export interface GuideCountry { pais: string; name: string; count: number; cities: GuideCityLink[] }
export interface GuideNavLink { href: string; label: string }

/** REQ-3335 (gate A3): máximo de países en el pie. */
export const FOOTER_GUIDE_COUNTRIES = 8;
export const GUIDES_PATH = "/guias";

// REQ-3333
export function guidesIndex(guides: CityGuide[], lang: string, countryName: (iso: string, lang: string) => string): GuideCountry[] {
  const byCountry = new Map<string, GuideCityLink[]>();
  for (const g of guides) {
    const t = guideIn(g, lang);
    if (!t) continue;
    const list = byCountry.get(g.pais) ?? [];
    list.push({ ciudad: g.ciudad, nombre: t.nombre, titulo: t.titulo, href: `${guideCityPath(g)}#guia` });
    byCountry.set(g.pais, list);
  }
  const collator = new Intl.Collator(lang, { sensitivity: "base" });
  return [...byCountry.entries()]
    .map(([pais, cities]) => ({ pais, name: countryName(pais, lang), count: cities.length, cities: cities.sort((a, b) => collator.compare(a.nombre, b.nombre)) }))
    .sort((a, b) => b.count - a.count || collator.compare(a.name, b.name));
}

const ALL: Record<string, string> = { es: "Todas las guías", en: "All guides" };

// REQ-3335 (gate A3): «Todas las guías» y hasta 8 países con su ancla en /guias.
export function footerGuideLinks(index: GuideCountry[], lang: string, max = FOOTER_GUIDE_COUNTRIES): GuideNavLink[] {
  if (!index.length) return [];
  return [{ href: GUIDES_PATH, label: ALL[lang] ?? ALL.en }, ...index.slice(0, max).map((c) => ({ href: `${GUIDES_PATH}#${c.pais}`, label: c.name }))];
}

// REQ-3334: idiomas en los que /guias tiene contenido (al menos una guía en ese idioma).
export function guidesLangs(guides: CityGuide[]): GuideLang[] {
  if (!guides.length) return [];
  return guides.some((g) => guideLangs(g).includes("en")) ? ["es", "en"] : ["es"];
}

const PAGE: Record<GuideLang, { title: string; description: string; h1: string; lead: string; count: (n: number) => string; home: string }> = {
  es: {
    title: "Guías de ciudad · Travel Puzzle",
    description: "Guías de ciudad de Travel Puzzle para preparar tu viaje desde México: qué ver, cómo moverte y qué reservar, con fuentes públicas enlazadas.",
    h1: "Guías de ciudad",
    lead: "Qué ver, cómo moverte y qué reservar en cada ciudad, con fuentes públicas enlazadas.",
    count: (n) => `${n} ${n === 1 ? "guía" : "guías"}`,
    home: "Inicio",
  },
  en: {
    title: "City guides · Travel Puzzle",
    description: "Travel Puzzle city guides to plan your trip: what to see, how to get around and what to book, with public sources linked.",
    h1: "City guides",
    lead: "What to see, how to get around and what to book in each city, with public sources linked.",
    count: (n) => `${n} ${n === 1 ? "guide" : "guides"}`,
    home: "Home",
  },
};

/** REQ-3334: textos de la página /guias por idioma. */
export const guidesPageCopy = (lang: GuideLang) => PAGE[lang];

// REQ-3334: title, canonical y hreflang de /guias.
export function guidesPageMeta(o: { lang: GuideLang; siteUrl: string; langs: readonly SupportedLanguage[] }) {
  const p = PAGE[o.lang];
  const a = localeAlternates({ siteUrl: o.siteUrl, path: GUIDES_PATH, lang: o.lang, langs: o.langs });
  return { title: p.title, description: p.description, canonical: a.canonical, index: a.index, languages: a.languages, lang: o.lang as SupportedLanguage };
}

// REQ-3334: /guias en sitemap-paginas.xml, con la fecha de la guía más reciente.
export function guidesSitemapUrls(guides: CityGuide[], siteUrl: string): { loc: string; lastmod: string | null }[] {
  if (!guides.length) return [];
  const last = guides.map((g) => g.publishedAt).sort().at(-1) ?? null;
  return [{ loc: `${siteUrl.replace(/\/+$/, "")}${GUIDES_PATH}`, lastmod: last }];
}
