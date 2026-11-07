/** I/O de las páginas institucionales para sitemap y llms.txt (lee process.env y el registro del blog). */
import { sitePagesFromEnv, PAGE_PATHS, pageLabel, type SitePageKey } from "./lib/pages";
import { sitePagesUrls } from "./lib/sitemap";
import { blogEnv, loadPosts } from "@/blog/load";
import { blogSitemapUrls } from "@/blog/lib/seo";

const env = () => process.env as Record<string, string | undefined>;
const site = () => (env().SITE_URL || "https://travelpuzzle.com.mx").replace(/\/+$/, "");

/** REQ-276: entradas de sitemap-paginas.xml (vacío si no hay páginas encendidas). */
export function sitePagesSitemap() {
  const e = env();
  const blog = blogEnv(e).enabled ? blogSitemapUrls(loadPosts(), site()) : [];
  return sitePagesUrls(sitePagesFromEnv(e), blog, site());
}

/** REQ-276: páginas para llms.txt (el blog solo si tiene publicados). */
export function sitePagesForLlms(): { name: string; url: string }[] {
  const urls = new Set(sitePagesSitemap().map((u) => u.loc));
  return (Object.keys(PAGE_PATHS) as SitePageKey[])
    .map((k) => ({ name: pageLabel(k, "es"), url: `${site()}${PAGE_PATHS[k]}` }))
    .filter((p) => urls.has(p.url));
}
