/**
 * REQ-262, REQ-263: metadatos, JSON-LD, compartir y sitemap del blog. Puro.
 * BlogPosting + Person + BreadcrumbList, coherentes con el texto visible; sin FAQPage (no da resultado enriquecido).
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

// REQ-262
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
    author: {
      "@type": "Person",
      name: author.name,
      ...(author.jobTitle ? { jobTitle: author.jobTitle } : {}),
      ...(author.sameAs.length ? { sameAs: author.sameAs } : {}),
    },
    publisher: { "@id": ORG_ID(site) },
  };
}

// REQ-263
export function shareLinks(url: string, title: string): { name: "WhatsApp" | "Facebook" | "LinkedIn"; href: string }[] {
  const tagged = (src: string) => `${url}${url.includes("?") ? "&" : "?"}utm_source=${src}&utm_medium=social&utm_campaign=blog`;
  return [
    { name: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${tagged("whatsapp")}`)}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(tagged("facebook"))}` },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(tagged("linkedin"))}` },
  ];
}

// REQ-263: solo publicados; /blog y los pilares entran solo si tienen artículos publicados.
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
