/** REQ-264: URLs de sitemap-paginas.xml: páginas institucionales encendidas + blog publicado. Puro. */
import type { UrlEntry } from "@/seo/lib/sitemaps";
import { PAGE_PATHS, type SitePages } from "./pages";

export function sitePagesUrls(pages: Partial<SitePages>, blogUrls: UrlEntry[], siteUrl: string): UrlEntry[] {
  const site = siteUrl.replace(/\/+$/, "");
  const fixed = (["nosotros", "contacto", "expertos"] as const).filter((k) => pages[k]).map((k) => ({ loc: `${site}${PAGE_PATHS[k]}`, lastmod: null }));
  return [...fixed, ...(pages.blog ? blogUrls : [])];
}
