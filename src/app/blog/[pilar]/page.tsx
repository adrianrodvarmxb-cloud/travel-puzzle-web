import type { Metadata } from 'next';
import Link from '@/components/i18n/LocalizedLink';
import { notFound } from 'next/navigation';
import { BlogShell } from '@/components/blog/BlogShell';
import { PostCard } from '@/components/blog/PostCard';
import { PageHeader } from '@/components/site/PageHeader';
import { JsonLd } from '@/components/destinations/JsonLd';
import { blogLanguage, blogState } from '@/blog/server';
import { blogLabels, blogLangs, pillarIn, postsIn } from '@/blog/lib/i18n';
import { localeAlternates } from '@/i18n/lib/alternates';
import { cardModel } from '@/blog/lib/view';
import { pillarBySlug, commercialHref } from '@/blog/lib/pillars';
import { pillarPath } from '@/blog/lib/registry';
import { breadcrumbJsonLd } from '@/seo/lib/jsonld';

export const dynamic = 'force-dynamic';

type Params = Promise<{ pilar: string }>;

// REQ-3450: el pilar y sus entradas en el idioma de la página; sin entradas en ese idioma, 404.
async function load(slug: string) {
  const s = blogState();
  const l = await blogLanguage();
  const base = pillarBySlug(slug);
  if (!s.flags.enabled || !l || !base || base.status !== 'activo') return null;
  const mine = s.visible.filter((p) => p.pillar === base.slug);
  const posts = postsIn(mine, l.lang);
  return posts.length ? { ...s, pillar: pillarIn(base, l.lang), posts, lang: l.lang, hreflang: l.hreflang, langs: blogLangs(mine) } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const d = await load((await params).pilar);
  if (!d) return {};
  const a = localeAlternates({ siteUrl: d.siteUrl, path: pillarPath(d.pillar.slug), lang: d.lang, langs: d.langs });
  return {
    title: blogLabels(d.lang).pillarTitle(d.pillar.h1),
    description: d.pillar.intro.slice(0, 155),
    alternates: { canonical: d.lang === 'es' ? pillarPath(d.pillar.slug) : a.canonical, ...(d.hreflang && a.languages ? { languages: a.languages } : {}) },
    ...(d.posts.every((p) => p.draft) ? { robots: { index: false, follow: true } } : {}),
  };
}

/** REQ-259: página pilar. Sin artículos visibles del pilar, o pilar bloqueado = 404. Resúmenes desde el registro. */
export default async function PillarPage({ params }: { params: Params }) {
  const d = await load((await params).pilar);
  if (!d) notFound();
  const L = blogLabels(d.lang);
  const href = pillarPath(d.pillar.slug);
  return (
    <BlogShell>
      <JsonLd data={[breadcrumbJsonLd([{ name: L.home, url: `${d.siteUrl}/` }, { name: 'Blog', url: `${d.siteUrl}/blog` }, { name: d.pillar.name, url: `${d.siteUrl}${href}` }])]} />
      <PageHeader crumbs={[{ name: L.home, href: '/' }, { name: 'Blog', href: '/blog' }, { name: d.pillar.name, href }]} eyebrow={d.pillar.name} title={d.pillar.h1} lead={d.pillar.intro}>
        <Link href={commercialHref(d.pillar, d.flags.primeraPieza)} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#008DFF] px-5 text-sm font-semibold text-white hover:bg-[#2EA0FF]">{d.pillar.commercial.label} →</Link>
      </PageHeader>
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="font-display text-2xl font-bold text-white">{L.pillarPosts}</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{d.posts.map((p) => <PostCard key={p.slug} p={cardModel(p, d.lang)} />)}</div>
      </section>
    </BlogShell>
  );
}
