/**
 * Sitemaps por país: sitemap-index.xml → sitemap-destinos.xml y sitemap-tours-{pais}.xml. Puro.
 * Solo URLs canónicas indexables que responden 200. lastmod = último cambio real del contenido
 * (contentHash de la Ola 1 o guía editada), nunca la fecha del sync: la entrada no la recibe.
 */
import { ROUTES, countryPath, cityPath, tourPath, type TourStatus } from "@/destinations/lib/routes";

export interface SitemapInput {
  siteUrl: string;
  countries: { slug: string; indexable: boolean }[];
  cities: { countrySlug: string; slug: string; indexable: boolean; guideUpdatedAt: string | null }[];
  tours: { countrySlug: string; citySlug: string; slug: string | null; status: TourStatus; contentUpdatedAt: string }[];
  /** REQ-584: fichas /viajes canónicas (ver sitemaps-viajes.ts), con el updatedAt del viaje. */
  trips?: { path: string; updatedAt: string }[];
}
export interface UrlEntry { loc: string; lastmod: string | null }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const day = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : null);
const latest = (xs: (string | null)[]) => xs.filter((x): x is string => !!x).sort().at(-1) ?? null;
const HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n';
const NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
const lm = (d: string | null) => (d ? `<lastmod>${d}</lastmod>` : "");

// REQ-102
export function urlsetXml(urls: UrlEntry[]): string {
  return `${HEAD}<urlset ${NS}>\n${urls.map((u) => `<url><loc>${esc(u.loc)}</loc>${lm(u.lastmod)}</url>`).join("\n")}\n</urlset>\n`;
}

// REQ-102
export function sitemapIndexXml(entries: UrlEntry[]): string {
  return `${HEAD}<sitemapindex ${NS}>\n${entries.map((e) => `<sitemap><loc>${esc(e.loc)}</loc>${lm(e.lastmod)}</sitemap>`).join("\n")}\n</sitemapindex>\n`;
}

// REQ-102
// REQ-276: `extraIndex` suma otros sitemaps al índice (p. ej. sitemap-paginas.xml); vacío = igual que antes.
export function buildSitemaps({ siteUrl, countries, cities, tours, trips = [] }: SitemapInput, extraIndex: UrlEntry[] = []): { index: string; files: Record<string, string> } {
  const site = siteUrl.replace(/\/+$/, "");
  const abs = (p: string) => `${site}${p}`;
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
    { loc: abs(ROUTES.destinos), lastmod: day(all) },
    ...[...countryOk].map((p) => ({ loc: abs(countryPath(p)), lastmod: day(countryLastmod(p)) })),
    ...[...cityLastmod].map(([k, v]) => { const [p, c] = k.split("/"); return { loc: abs(cityPath(p, c)), lastmod: day(v) }; }),
  ];
  const files: Record<string, string> = { "sitemap-destinos.xml": urlsetXml(destinos) };
  const index: UrlEntry[] = [{ loc: abs("/sitemap-destinos.xml"), lastmod: day(all) }];

  for (const pais of countryOk) {
    const mine = live.filter((t) => t.countrySlug === pais);
    if (!mine.length) continue;
    const name = `sitemap-tours-${pais}.xml`;
    files[name] = urlsetXml(mine.map((t) => ({ loc: abs(tourPath(t.countrySlug, t.citySlug, t.slug)), lastmod: day(t.contentUpdatedAt) })));
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
