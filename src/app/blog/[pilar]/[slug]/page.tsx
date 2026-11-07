import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogShell } from '@/components/blog/BlogShell';
import { ArticleView } from '@/components/blog/ArticleView';
import { JsonLd } from '@/components/destinations/JsonLd';
import { SectionBoundary } from '@/components/common/SectionBoundary';
import { blogState } from '@/blog/server';
import { articleModel } from '@/blog/lib/view';
import { postMeta, blogPostingJsonLd } from '@/blog/lib/seo';
import { pillarBySlug } from '@/blog/lib/pillars';
import { pillarPath, postPath } from '@/blog/lib/registry';
import { AUTHORS } from '@/blog/content/authors';
import { breadcrumbJsonLd } from '@/seo/lib/jsonld';

export const dynamic = 'force-dynamic';

type Params = Promise<{ pilar: string; slug: string }>;

function load(pilar: string, slug: string) {
  const s = blogState();
  if (!s.flags.enabled) return null;
  const post = s.visible.find((p) => p.pillar === pilar && p.slug === slug);
  return post ? { ...s, post } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { pilar, slug } = await params;
  const d = load(pilar, slug);
  if (!d) return {};
  const m = postMeta(d.post);
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: m.canonical },
    openGraph: { type: 'article', title: m.title, description: m.description, url: m.canonical, ...(d.post.cover ? { images: [{ url: d.post.cover.src }] } : {}) },
    ...(m.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

/** REQ-253…263: artículo con la plantilla de 14 bloques. Un borrador solo existe con BLOG_SHOW_DRAFTS (preview). */
export default async function ArticlePage({ params }: { params: Params }) {
  const { pilar, slug } = await params;
  const d = load(pilar, slug);
  if (!d) notFound();
  const pillar = pillarBySlug(d.post.pillar)!;
  const author = AUTHORS[d.post.author];
  const model = articleModel(d.post, d.visible, { author, siteUrl: d.siteUrl, primeraPieza: d.flags.primeraPieza, whatsapp: d.whatsapp, authorHref: d.nosotros ? '/nosotros' : null });
  return (
    <BlogShell>
      <JsonLd data={[
        blogPostingJsonLd(d.post, author, d.siteUrl),
        breadcrumbJsonLd([
          { name: 'Inicio', url: `${d.siteUrl}/` },
          { name: 'Blog', url: `${d.siteUrl}/blog` },
          { name: pillar.name, url: `${d.siteUrl}${pillarPath(pillar.slug)}` },
          { name: d.post.title, url: `${d.siteUrl}${postPath(d.post)}` },
        ]),
      ]} />
      <SectionBoundary name="blog-articulo"><ArticleView m={model} /></SectionBoundary>
    </BlogShell>
  );
}
