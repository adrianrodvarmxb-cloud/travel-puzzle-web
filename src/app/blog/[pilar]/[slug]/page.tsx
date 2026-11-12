import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogShell } from '@/components/blog/BlogShell';
import { ArticleView } from '@/components/blog/ArticleView';
import { JsonLd } from '@/components/destinations/JsonLd';
import { SectionBoundary } from '@/components/common/SectionBoundary';
import { blogLanguage, blogState } from '@/blog/server';
import { blogLabels, localizePost, pillarIn, postLangs, postsIn } from '@/blog/lib/i18n';
import { localeAlternates } from '@/i18n/lib/alternates';
import { articleModel } from '@/blog/lib/view';
import { postMeta, blogPostingJsonLd } from '@/blog/lib/seo';
import { pillarBySlug } from '@/blog/lib/pillars';
import { pillarPath, postPath } from '@/blog/lib/registry';
import { AUTHORS } from '@/blog/content/authors';
import { breadcrumbJsonLd } from '@/seo/lib/jsonld';
import { imageUrl } from '@/blog/lib/images';

export const dynamic = 'force-dynamic';

type Params = Promise<{ pilar: string; slug: string }>;

// REQ-3450: el artículo en el idioma de la página; sin versión en ese idioma, 404 (nunca el español en inglés).
async function load(pilar: string, slug: string) {
  const s = blogState();
  const l = await blogLanguage();
  if (!s.flags.enabled || !l) return null;
  const base = s.visible.find((p) => p.pillar === pilar && p.slug === slug);
  const post = base ? localizePost(base, l.lang) : null;
  return post && base ? { ...s, post, visible: postsIn(s.visible, l.lang), lang: l.lang, hreflang: l.hreflang, langs: postLangs(base) } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { pilar, slug } = await params;
  const d = await load(pilar, slug);
  if (!d) return {};
  const m = postMeta(d.post);
  const a = localeAlternates({ siteUrl: d.siteUrl, path: m.canonical, lang: d.lang, langs: d.langs });
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: d.lang === 'es' ? m.canonical : a.canonical, ...(d.hreflang && a.languages ? { languages: a.languages } : {}) },
    openGraph: { type: 'article', title: m.title, description: m.description, url: m.canonical, ...(d.post.cover ? { images: [{ url: imageUrl(d.post.cover.src, d.siteUrl), alt: d.post.cover.alt }] } : {}) },
    ...(m.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

/** REQ-253…263: artículo con la plantilla de 14 bloques. Un borrador solo existe con BLOG_SHOW_DRAFTS (preview). */
export default async function ArticlePage({ params }: { params: Params }) {
  const { pilar, slug } = await params;
  const d = await load(pilar, slug);
  if (!d) notFound();
  const L = blogLabels(d.lang);
  const pillar = pillarIn(pillarBySlug(d.post.pillar)!, d.lang);
  const author = AUTHORS[d.post.author];
  const model = articleModel(d.post, d.visible, { author, siteUrl: d.siteUrl, primeraPieza: d.flags.primeraPieza, whatsapp: d.whatsapp, authorHref: d.nosotros ? '/nosotros' : null, lang: d.lang });
  return (
    <BlogShell>
      <JsonLd data={[
        { ...blogPostingJsonLd(d.post, author, d.siteUrl), inLanguage: L.inLanguage, articleSection: pillar.name },
        breadcrumbJsonLd([
          { name: L.home, url: `${d.siteUrl}/` },
          { name: 'Blog', url: `${d.siteUrl}/blog` },
          { name: pillar.name, url: `${d.siteUrl}${pillarPath(pillar.slug)}` },
          { name: d.post.title, url: `${d.siteUrl}${postPath(d.post)}` },
        ]),
      ]} />
      <SectionBoundary name="blog-articulo"><ArticleView m={model} /></SectionBoundary>
    </BlogShell>
  );
}
