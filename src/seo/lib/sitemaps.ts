/**
 * Sitemaps por país: sitemap-index.xml → sitemap-destinos.xml y sitemap-tours-{pais}.xml. Puro.
 * Solo URLs canónicas indexables que responden 200. lastmod = último cambio real del contenido
 * (contentHash de la Ola 1 o guía editada), nunca la fecha del sync: la entrada no la recibe.
 */
import { ROUTES, countryPath, cityPath, tourPath, type TourStatus } from "@/destinations/lib/routes";
import type { SupportedLanguage } from "@/types";
import { localeAlternates } from "@/i18n/lib/alternates";
import { LOCALES } from "@/i18n/lib/locales";

/**
 * REQ-663 (Gate 3): `langs` = idiomas en que la página es indexable (solo con LOCALE_URLS_ENABLED). Sin `langs`,
 * una sola URL en español como antes. Con `langs`, una <url> por idioma indexable, cada una con la misma serie de
 * xhtml:link (recíproca) y x-default = español. Lo que no es indexable no entra en ningún idioma.
 */
type Langs = { langs?: readonly SupportedLanguage[] };
export interface SitemapInput {
  siteUrl: string;
  countries: ({ slug: string; indexable: boolean } & Langs)[];
  cities: ({ countrySlug: string; slug: string; indexable: boolean; guideUpdatedAt: string | null } & Langs)[];
  tours: ({ countrySlug: string; citySlug: string; slug: string | null; status: TourStatus; contentUpdatedAt: string } & Langs)[];
  /** REQ-663: idiomas del hub /destinos (con la bandera). */
  hubLangs?: readonly SupportedLanguage[];
  /** REQ-584: fichas /viajes canónicas (ver sitemaps-viajes.ts), con el updatedAt del viaje. */
  trips?: { path: string; updatedAt: string }[];
}
export interface UrlEntry { loc: string; lastmod: string | null; /** REQ-663: hreflang → URL */ alternates?: Record<string, string> }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const day = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : null);
const latest = (xs: (string | null)[]) => xs.filter((x): x is string => !!x).sort().at(-1) ?? null;
const HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n';
const NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
const XHTML = 'xmlns:xhtml="http://www.w3.org/1999/xhtml"';
const alt = (a?: Record<string, string>) => (a ? Object.entries(a).map(([l, h]) => `<xhtml:link rel="alternate" hreflang="${esc(l)}" href="${esc(h)}"/>`).join("") : "");
const lm = (d: string | null) => (d ? `<lastmod>${d}</lastmod>` : "");

// REQ-102
export function urlsetXml(urls: UrlEntry[]): string {
  // REQ-663: el espacio xhtml solo si alguna URL lleva alternates (sin la bandera, el XML es el de siempre).
  const ns = urls.some((u) => u.alternates) ? `${NS} ${XHTML}` : NS;
  return `${HEAD}<urlset ${ns}>\n${urls.map((u) => `<url><loc>${esc(u.loc)}</loc>${lm(u.lastmod)}${alt(u.alternates)}</url>`).join("\n")}\n</urlset>\n`;
}

// REQ-102
export function sitemapIndexXml(entries: UrlEntry[]): string {
  return `${HEAD}<sitemapindex ${NS}>\n${entries.map((e) => `<sitemap><loc>${esc(e.loc)}</loc>${lm(e.lastmod)}</sitemap>`).join("\n")}\n</sitemapindex>\n`;
}

// REQ-102
// REQ-276: `extraIndex` suma otros sitemaps al índice (p. ej. sitemap-paginas.xml); vacío = igual que antes.
export function buildSitemaps({ siteUrl, countries, cities, tours, trips = [], hubLangs }: SitemapInput, extraIndex: UrlEntry[] = []): { index: string; files: Record<string, string> } {
  const site = siteUrl.replace(/\/+$/, "");
  const abs = (p: string) => `${site}${p}`;
  // REQ-663: una entrada por idioma indexable con sus alternates; sin `langs`, la de siempre.
  const expand = (path: string, lastmod: string | null, langs?: readonly SupportedLanguage[]): UrlEntry[] => {
    if (!langs) return [{ loc: abs(path), lastmod }];
    const es = localeAlternates({ siteUrl: site, path, lang: "es", langs });
    if (!es.index || !es.languages) return [{ loc: abs(path), lastmod }];
    return LOCALES.filter((l) => es.languages![l]).map((l) => ({ loc: es.languages![l], lastmod, alternates: es.languages! }));
  };
  const langsOf = new Map<string, readonly SupportedLanguage[] | undefined>();
  for (const c of countries) langsOf.set(`p:${c.slug}`, c.langs);
  for (const c of cities) langsOf.set(`c:${c.countrySlug}/${c.slug}`, c.langs);
  const countryOk = new Set(countries.filter((c) => c.indexable).map((c) => c.slug));
  const cityKey = (pais: string, ciudad: string) => `${pais}/${ciudad}`;
  const cityOk = new Set(cities.filter((c) => c.indexable && countryOk.has(c.countrySlug)).map((c) => cityKey(c.countrySlug, c.slug)));

  // Tours publicados: con slug, no removidos (missing sigue respondiendo 200) y en una ciudad indexable.
  const live = tours.filter((t): t is typeof t & { slug: string } => !!t.slug && t.status !== "removed" && cityOk.has(cityKey(t.countrySlug, t.citySlug)));

  const cityLastmod = new Map<string, string | null>();
  for (const c of cities) {
    const k = cityKey(c.countrySlug, c.slug);
    if (!cityOk.has(k)) continue;
    cityLastmod.set(k, latest([c.guideUpdatedAt, ...live.filter((t) => cityKey(t.countrySlug, t.citySlug) === k).map((t) => t.contentUpdatedAt)]));
  }
  const countryLastmod = (pais: string) => latest([...cityLastmod].filter(([k]) => k.startsWith(`${pais}/`)).map(([, v]) => v));
  const all = latest([...cityLastmod.values()]);

  const destinos: UrlEntry[] = [
    { loc: abs(ROUTES.primeraPieza), lastmod: day(all) },
    ...expand(ROUTES.destinos, day(all), hubLangs),
    ...[...countryOk].flatMap((p) => expand(countryPath(p), day(countryLastmod(p)), langsOf.get(`p:${p}`))),
    ...[...cityLastmod].flatMap(([k, v]) => { const [p, c] = k.split("/"); return expand(cityPath(p, c), day(v), langsOf.get(`c:${k}`)); }),
  ];
  const files: Record<string, string> = { "sitemap-destinos.xml": urlsetXml(destinos) };
  const index: UrlEntry[] = [{ loc: abs("/sitemap-destinos.xml"), lastmod: day(all) }];

  for (const pais of countryOk) {
    const mine = live.filter((t) => t.countrySlug === pais);
    if (!mine.length) continue;
    const name = `sitemap-tours-${pais}.xml`;
    files[name] = urlsetXml(mine.flatMap((t) => expand(tourPath(t.countrySlug, t.citySlug, t.slug), day(t.contentUpdatedAt), t.langs)));
    index.push({ loc: abs(`/${name}`), lastmod: day(latest(mine.map((t) => t.contentUpdatedAt))) });
  }
  index.push(...extraIndex);
  // REQ-584: viajes con ficha canónica en /viajes, lastmod = updatedAt del viaje.
  if (trips.length) {
    files["sitemap-viajes.xml"] = urlsetXml(trips.map((t) => ({ loc: abs(t.path), lastmod: day(t.updatedAt) })));
    index.push({ loc: abs("/sitemap-viajes.xml"), lastmod: day(latest(trips.map((t) => t.updatedAt))) });
  }
  return { index: sitemapIndexXml(index), files };
}

/** REQ-1341: lastmod de sitemap-paginas.xml en el índice = la fecha más reciente de sus URLs (YYYY-MM-DD); sin fechas, null. */
export function pagesIndexLastmod(entries: readonly UrlEntry[]): string | null {
  const days = entries.map((e) => e.lastmod).filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d)).map((d) => d.slice(0, 10));
  return days.length ? days.reduce((a, b) => (b > a ? b : a)) : null;
}
