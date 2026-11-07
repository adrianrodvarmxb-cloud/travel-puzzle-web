import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BlogShell } from '@/components/blog/BlogShell';
import { PostCard } from '@/components/blog/PostCard';
import { PageHeader } from '@/components/site/PageHeader';
import { JsonLd } from '@/components/destinations/JsonLd';
import { blogState } from '@/blog/server';
import { cardModel } from '@/blog/lib/view';
import { pillarBySlug, commercialHref } from '@/blog/lib/pillars';
import { pillarPath } from '@/blog/lib/registry';
import { breadcrumbJsonLd } from '@/seo/lib/jsonld';

export const dynamic = 'force-dynamic';

type Params = Promise<{ pilar: string }>;

function load(slug: string) {
  const s = blogState();
  const pillar = pillarBySlug(slug);
  if (!s.flags.enabled || !pillar || pillar.status !== 'activo') return null;
  const posts = s.visible.filter((p) => p.pillar === pillar.slug);
  return posts.length ? { ...s, pillar, posts } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const d = load((await params).pilar);
  if (!d) return {};
  return {
    title: `${d.pillar.h1}: guía`,
    description: d.pillar.intro.slice(0, 155),
    alternates: { canonical: pillarPath(d.pillar.slug) },
    ...(d.posts.every((p) => p.draft) ? { robots: { index: false, follow: true } } : {}),
  };
}

/** REQ-259: página pilar. Sin artículos visibles del pilar, o pilar bloqueado = 404. Resúmenes desde el registro. */
export default async function PillarPage({ params }: { params: Params }) {
  const d = load((await params).pilar);
  if (!d) notFound();
  const href = pillarPath(d.pillar.slug);
  return (
    <BlogShell>
      <JsonLd data={[breadcrumbJsonLd([{ name: 'Inicio', url: `${d.siteUrl}/` }, { name: 'Blog', url: `${d.siteUrl}/blog` }, { name: d.pillar.name, url: `${d.siteUrl}${href}` }])]} />
      <PageHeader crumbs={[{ name: 'Inicio', href: '/' }, { name: 'Blog', href: '/blog' }, { name: d.pillar.name, href }]} eyebrow={d.pillar.name} title={d.pillar.h1} lead={d.pillar.intro}>
        <Link href={commercialHref(d.pillar, d.flags.primeraPieza)} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#008DFF] px-5 text-sm font-semibold text-white hover:bg-[#2EA0FF]">{d.pillar.commercial.label} →</Link>
      </PageHeader>
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="font-display text-2xl font-bold text-white">Artículos de esta guía</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{d.posts.map((p) => <PostCard key={p.slug} p={cardModel(p)} />)}</div>
      </section>
    </BlogShell>
  );
}
