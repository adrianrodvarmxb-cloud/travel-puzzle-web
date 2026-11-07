import type { Metadata } from 'next';
import Link from '@/components/i18n/LocalizedLink';
import { notFound } from 'next/navigation';
import { BlogShell } from '@/components/blog/BlogShell';
import { PostCard } from '@/components/blog/PostCard';
import { PageHeader } from '@/components/site/PageHeader';
import { JsonLd } from '@/components/destinations/JsonLd';
import { blogState } from '@/blog/server';
import { cardModel } from '@/blog/lib/view';
import { pillarsWithPosts, pillarPath } from '@/blog/lib/registry';
import { breadcrumbJsonLd } from '@/seo/lib/jsonld';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { visible } = blogState();
  return {
    title: 'Blog',
    description: 'Guías de Travel Puzzle para preparar tu viaje desde México: documentos, rutas, temporadas y cómo moverte en tu destino.',
    alternates: { canonical: '/blog' },
    ...(visible.every((p) => p.draft) ? { robots: { index: false, follow: true } } : {}),
  };
}

/** REQ-253…263: índice del blog. Apagado o sin artículos visibles = 404 (no se enlaza una sección vacía). */
export default function BlogIndex() {
  const { flags, visible, siteUrl } = blogState();
  if (!flags.enabled || !visible.length) notFound();
  const [first, ...rest] = visible.map(cardModel);
  const pillars = pillarsWithPosts(visible);
  return (
    <BlogShell>
      <JsonLd data={[breadcrumbJsonLd([{ name: 'Inicio', url: `${siteUrl}/` }, { name: 'Blog', url: `${siteUrl}/blog` }])]} />
      <PageHeader crumbs={[{ name: 'Inicio', href: '/' }, { name: 'Blog', href: '/blog' }]} eyebrow="Blog" title="Blog" lead="Guías para preparar tu viaje desde México.">
        {pillars.length > 1 && (
          <nav aria-label="Filtrar por destino" className="mt-6 flex flex-wrap gap-2">
            {pillars.map((p) => <Link key={p.slug} href={pillarPath(p.slug)} className="inline-flex min-h-9 items-center rounded-full border border-white/20 px-4 text-sm text-white hover:bg-white/10">{p.name}</Link>)}
          </nav>
        )}
      </PageHeader>
      <section className="mx-auto max-w-5xl space-y-6 px-4 pb-16">
        <PostCard p={first} featured />
        {rest.length > 0 && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{rest.map((p) => <PostCard key={p.href} p={p} />)}</div>}
      </section>
    </BlogShell>
  );
}
