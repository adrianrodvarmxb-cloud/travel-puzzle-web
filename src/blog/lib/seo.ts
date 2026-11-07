/**
 * REQ-274, REQ-275: metadatos, JSON-LD, compartir y sitemap del blog. Puro.
 * BlogPosting + Person/Organization (REQ-971) + BreadcrumbList, coherentes con el texto visible; sin FAQPage (no da resultado enriquecido).
 * REQ-973, REQ-974, REQ-976: entradas para llms.txt, IndexNow y la prueba de humo.
 */
import type { Post } from "./schema";
import type { Author } from "../content/authors";
import { pillarBySlug } from "./pillars";
import { postPath, pillarPath, pillarsWithPosts } from "./registry";
import { ORG_ID } from "@/seo/lib/pages-jsonld";
import type { UrlEntry } from "@/seo/lib/sitemaps";

const base = (u: string) => u.replace(/\/+$/, "");

export function postMeta(p: Post) {
  return { title: p.title, description: p.summary.slice(0, 155), canonical: postPath(p), noindex: p.draft };
}

// REQ-274
export function blogPostingJsonLd(p: Post, author: Author, siteUrl: string) {
  const site = base(siteUrl);
  const url = `${site}${postPath(p)}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.summary,
    datePublished: p.publishedAt,
    ...(p.updatedAt ? { dateModified: p.updatedAt } : {}),
    inLanguage: "es-MX",
    articleSection: pillarBySlug(p.pillar)?.name ?? p.pillar,
    mainEntityOfPage: url,
    url,
    ...(p.cover?.src ? { image: p.cover.src.startsWith("/") ? `${site}${p.cover.src}` : p.cover.src } : {}),
    // REQ-971: el equipo editorial es Organization ligada a la organización del sitio; nunca una persona inventada.
    author: author.kind === "Organization"
      ? { "@type": "Organization", name: author.name, url: `${site}/`, parentOrganization: { "@id": ORG_ID(site) } }
      : {
          "@type": "Person",
          name: author.name,
          ...(author.jobTitle ? { jobTitle: author.jobTitle } : {}),
          ...(author.sameAs.length ? { sameAs: author.sameAs } : {}),
        },
    publisher: { "@id": ORG_ID(site) },
  };
}

// REQ-275
export function shareLinks(url: string, title: string): { name: "WhatsApp" | "Facebook" | "LinkedIn"; href: string }[] {
  const tagged = (src: string) => `${url}${url.includes("?") ? "&" : "?"}utm_source=${src}&utm_medium=social&utm_campaign=blog`;
  return [
    { name: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${tagged("whatsapp")}`)}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(tagged("facebook"))}` },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(tagged("linkedin"))}` },
  ];
}

// REQ-275: solo publicados; /blog y los pilares entran solo si tienen artículos publicados.
export function blogSitemapUrls(posts: Post[], siteUrl: string): UrlEntry[] {
  const site = base(siteUrl);
  const pub = posts.filter((p) => !p.draft && pillarBySlug(p.pillar)?.status === "activo");
  if (!pub.length) return [];
  const last = (xs: Post[]) => xs.map((p) => p.updatedAt ?? p.publishedAt).sort().at(-1) ?? null;
  return [
    { loc: `${site}/blog`, lastmod: last(pub) },
    ...pillarsWithPosts(pub).map((pl) => ({ loc: `${site}${pillarPath(pl.slug)}`, lastmod: last(pub.filter((p) => p.pillar === pl.slug)) })),
    ...pub.map((p) => ({ loc: `${site}${postPath(p)}`, lastmod: p.updatedAt ?? p.publishedAt })),
  ];
}

const byNewest = (a: Post, b: Post) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : a.slug.localeCompare(b.slug));
const live = (posts: Post[]) => posts.filter((p) => !p.draft && pillarBySlug(p.pillar)?.status === "activo").sort(byNewest);

// REQ-974: URL que se avisan a IndexNow justo después de publicar una entrada.
export function blogIndexNowUrls(p: Post, siteUrl: string): string[] {
  const site = base(siteUrl);
  return [`${site}${postPath(p)}`, `${site}/blog`, `${site}${pillarPath(p.pillar)}`];
}

// REQ-973: las 20 entradas publicadas más recientes para llms.txt.
export const LLMS_BLOG_MAX = 20;
export function blogLlmsEntries(posts: Post[], siteUrl: string): { name: string; url: string }[] {
  const site = base(siteUrl);
  return live(posts).slice(0, LLMS_BLOG_MAX).map((p) => ({ name: p.title, url: `${site}${postPath(p)}` }));
}

// REQ-976: páginas del blog que la prueba de humo exige con BLOG_ENABLED encendida.
export const SMOKE_BLOG_POSTS = 5;
export function blogSmokePaths(posts: Post[]): string[] {
  const pub = live(posts);
  if (!pub.length) return [];
  return ["/blog", ...pillarsWithPosts(pub).map((pl) => pillarPath(pl.slug)), ...pub.slice(0, SMOKE_BLOG_POSTS).map(postPath)];
}
