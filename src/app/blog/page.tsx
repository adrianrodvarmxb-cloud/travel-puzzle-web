import type { Metadata } from 'next';
import Link from '@/components/i18n/LocalizedLink';
import { notFound } from 'next/navigation';
import { BlogShell } from '@/components/blog/BlogShell';
import { PostCard } from '@/components/blog/PostCard';
import { PageHeader } from '@/components/site/PageHeader';
import { JsonLd } from '@/components/destinations/JsonLd';
import { blogLanguage, blogState } from '@/blog/server';
import { blogLabels, blogLangs, postsIn } from '@/blog/lib/i18n';
import { localeAlternates } from '@/i18n/lib/alternates';
import { cardModel } from '@/blog/lib/view';
import { pillarsWithPosts, pillarPath } from '@/blog/lib/registry';
import { pillarIn } from '@/blog/lib/i18n';
import { breadcrumbJsonLd } from '@/seo/lib/jsonld';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { visible, siteUrl } = blogState();
  const l = await blogLanguage();
  if (!l) return {};
  const posts = postsIn(visible, l.lang);
  // REQ-3450: canonical por idioma y hreflang es/en cuando hay entradas en inglés.
  const a = localeAlternates({ siteUrl, path: '/blog', lang: l.lang, langs: blogLangs(visible) });
  return {
    title: 'Blog',
    description: blogLabels(l.lang).indexDescription,
    alternates: { canonical: l.lang === 'es' ? '/blog' : a.canonical, ...(l.hreflang && a.languages ? { languages: a.languages } : {}) },
    ...(posts.every((p) => p.draft) ? { robots: { index: false, follow: true } } : {}),
  };
}

/** REQ-253…263: índice del blog. Apagado o sin artículos visibles = 404 (no se enlaza una sección vacía). */
export default async function BlogIndex() {
  const { flags, visible: all, siteUrl } = blogState();
  const l = await blogLanguage();
  // REQ-3450: en inglés solo las entradas con versión en inglés; sin ninguna, 404.
  const visible = l ? postsIn(all, l.lang) : [];
  if (!flags.enabled || !l || !visible.length) notFound();
  const L = blogLabels(l.lang);
  const [first, ...rest] = visible.map((p) => cardModel(p, l.lang));
  const pillars = pillarsWithPosts(visible).map((p) => pillarIn(p, l.lang));
  return (
    <BlogShell>
      <JsonLd data={[breadcrumbJsonLd([{ name: L.home, url: `${siteUrl}/` }, { name: 'Blog', url: `${siteUrl}/blog` }])]} />
      <PageHeader crumbs={[{ name: L.home, href: '/' }, { name: 'Blog', href: '/blog' }]} eyebrow="Blog" title="Blog" lead={L.indexLead}>
        {pillars.length > 1 && (
          <nav aria-label={L.filter} className="mt-6 flex flex-wrap gap-2">
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
