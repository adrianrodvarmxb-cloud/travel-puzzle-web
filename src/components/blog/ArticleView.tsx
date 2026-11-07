import Link from '@/components/i18n/LocalizedLink';
import { Breadcrumbs } from '@/components/destinations/Breadcrumbs';
import { Inline } from './Inline';
import { PostCard, type PostCardModel } from './PostCard';
import type { Post } from '@/blog/lib/schema';
import { headingId } from '@/blog/lib/toc';
import { BlogHero, BlogImageBlock } from './BlogImages';

export interface ArticleModel {
  post: Post;
  pillar: { name: string; href: string; commercialHref: string; commercialLabel: string };
  author: { name: string; jobTitle: string | null; href: string | null };
  published: string;
  updated: string | null;
  minutes: number;
  toc: { id: string; label: string }[];
  share: { name: string; href: string }[];
  siblings: PostCardModel[];
  prev: { href: string; title: string } | null;
  next: { href: string; title: string } | null;
  explore: { name: string; href: string; posts: { href: string; title: string; current: boolean }[] }[];
  ctaHref: string | null;
}

const GAP = '[PO:';
/** En borrador, los huecos se ven en morado (propuesta para el cliente); un publicado no puede tenerlos (REQ-254). */
const gapCls = (s: string) => (s.includes(GAP) ? 'rounded-lg border border-dashed border-[#B98CFF] bg-[#B98CFF]/10 px-3 py-2 text-[#E3D2FF]' : '');

function Share({ links, label }: { links: { name: string; href: string }[]; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-data text-[11px] uppercase tracking-[0.2em] text-[#A9B6D6]">{label}</span>
      {links.map((l) => (
        <a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-full border border-white/20 px-3 text-xs font-semibold text-white hover:bg-white/10">{l.name}</a>
      ))}
    </div>
  );
}

/** REQ-253…263: plantilla de 14 bloques. Un bloque opcional sin datos no se pinta. Sin hooks: se pinta en el servidor. */
export function ArticleView({ m }: { m: ArticleModel }) {
  const p = m.post;
  return (
    <article className="pb-16">
      {p.draft && (
        <p role="note" className="bg-[#C12909] px-4 py-2 text-center text-sm font-semibold text-white">BORRADOR · No publicado. Solo se ve en el preview (BLOG_SHOW_DRAFTS) y no se indexa.</p>
      )}
      <header className="mx-auto max-w-3xl px-4 pt-8 md:pt-12">
        <Link href="/blog" className="text-sm text-[#A9B6D6] hover:text-white">← Todos los artículos</Link>
        <div className="mt-4"><Breadcrumbs items={[{ name: 'Inicio', href: '/' }, { name: 'Blog', href: '/blog' }, { name: m.pillar.name, href: m.pillar.href }, { name: p.title, href: '#' }]} /></div>
        {/* 1 · H1 con el pilar arriba */}
        <p className="font-data mt-8 text-xs uppercase tracking-[0.3em] text-[#EAF54F]">{m.pillar.name}</p>
        <h1 className="font-display mt-2 text-3xl font-bold leading-[1.1] text-white md:text-5xl">{p.title}</h1>
        {/* 2 · Firma */}
        <p className="mt-5 text-sm text-[#C9D6F5]">
          {m.author.href ? <Link href={m.author.href} className="font-semibold text-white hover:underline">{m.author.name}</Link> : <span className="font-semibold text-white">{m.author.name}</span>}
          {m.author.jobTitle && <>, {m.author.jobTitle}</>}
          <span className="text-[#7F8DB0]"> · {m.published}{m.updated && <> · Actualizado: {m.updated}</>} · {m.minutes} min de lectura</span>
        </p>
        <div className="mt-4"><Share links={m.share} label="Compartir" /></div>
      </header>

      {/* REQ-1053: portada a todo el ancho con velo de marca, sin lazy */}
      {p.cover && <BlogHero img={p.cover} />}

      <div className="mx-auto max-w-3xl px-4 text-[17px] leading-[1.7] text-[#C9D6F5] md:text-[18px]">
        {/* 3 · En breve */}
        <aside aria-label="En breve" className={`mt-8 rounded-2xl border-l-4 border-[#EAF54F] bg-[#0E1A40] p-5 ${gapCls(p.enBreve)}`}>
          <p className="font-data mb-1 text-[11px] uppercase tracking-[0.25em] text-[#EAF54F]">En breve</p>
          <p className="text-white"><Inline text={p.enBreve} /></p>
        </aside>
        {/* 4 · Entrada */}
        <p className={`mt-6 ${gapCls(p.entrada)}`}><Inline text={p.entrada} /></p>

        {m.toc.length > 0 && (
          <details open className="mt-8 rounded-2xl border border-white/10 bg-[#0E1A40] p-5">
            <summary className="cursor-pointer font-display font-bold text-white">En esta página</summary>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-[15px]">
              {m.toc.map((t) => <li key={t.id}><a href={`#${t.id}`} className="hover:text-white hover:underline">{t.label}</a></li>)}
            </ol>
          </details>
        )}

        {/* 5 · H2 con su respuesta */}
        {p.sections.map((s, si) => (
          <section key={s.h2} aria-labelledby={headingId(s.h2)}>
            <h2 id={headingId(s.h2)} className="font-display mt-12 scroll-mt-24 text-2xl font-bold leading-snug text-white md:text-3xl">{s.h2}</h2>
            <p className={`mt-3 font-medium text-white ${gapCls(s.answer)}`}><Inline text={s.answer} /></p>
            {s.body.map((b) => <p key={b} className={`mt-4 ${gapCls(b)}`}><Inline text={b} /></p>)}
            {s.list && <ul className="mt-4 list-disc space-y-1 pl-6">{s.list.map((li) => <li key={li}><Inline text={li} /></li>)}</ul>}
            {/* REQ-1053: imágenes del cuerpo después de su sección */}
            {(p.imagenes ?? []).filter((b) => b.despues === si).map((b) => <BlogImageBlock key={b.fotos[0].src} b={b} />)}
          </section>
        ))}

        {/* 6 · Minicaso */}
        {p.minicaso && (
          <aside aria-label="Caso" className={`mt-12 rounded-2xl border border-[#008DFF]/45 bg-[#0E1A40] p-5 ${gapCls(p.minicaso.text)}`}>
            <p className="font-data mb-1 text-[11px] uppercase tracking-[0.25em] text-[#008DFF]">{p.minicaso.illustrative ? 'Ejemplo ilustrativo' : 'Un caso'}</p>
            <p><Inline text={p.minicaso.text} /></p>
          </aside>
        )}
        {/* 7 · Citas */}
        {p.citas?.map((c) => (
          <blockquote key={c.text} className={`font-display mt-10 border-l-4 border-[#EAF54F] pl-5 text-2xl italic leading-snug text-white ${gapCls(c.text)}`}>
            «<Inline text={c.text} />»<footer className="mt-2 text-sm not-italic text-[#A9B6D6]">— {c.who}</footer>
          </blockquote>
        ))}
        {/* 8 · Datos con fuente */}
        {p.datos?.length ? (
          <ul className="mt-10 space-y-3">
            {p.datos.map((d) => (
              <li key={d.text} className="rounded-xl bg-white/5 p-4 text-[15px]">
                <Inline text={d.text} /> <span className="text-[#A9B6D6]">Fuente: <a href={d.source.url} target="_blank" rel="noopener noreferrer" className="underline">{d.source.label}</a> (consultada el {d.checkedAt}).</span>
              </li>
            ))}
          </ul>
        ) : null}
        {/* 10 · Visual autónomo */}
        {p.visual && (
          <figure className="mt-10">
            <p className="mb-2 text-xs text-[#7F8DB0] md:hidden">Desliza la tabla →</p>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[520px] text-left text-[15px]">
                <thead className="bg-[#0A1330] text-white"><tr>{p.visual.head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
                <tbody>{p.visual.rows.map((r, i) => <tr key={i} className={i % 2 ? 'bg-[#0E1A40]' : 'bg-[#10204D]'}>{r.map((c, j) => <td key={j} className={`px-4 py-3 ${c.includes(GAP) ? 'text-[#E3D2FF]' : ''}`}>{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
            <figcaption className={`mt-2 text-sm text-[#A9B6D6] ${gapCls(p.visual.caption)}`}>
              {p.visual.caption}
              {/* REQ-966: la tabla con cifras lleva su fuente pública enlazada */}
              {p.visual.source && <> Fuente: <a href={p.visual.source.url} target="_blank" rel="noopener noreferrer" className="underline">{p.visual.source.label}</a>.</>}
            </figcaption>
          </figure>
        )}
        {/* 12 · FAQ (sin schema FAQPage) */}
        {p.faq?.length ? (
          <section aria-labelledby="preguntas" className="mt-12">
            <h2 id="preguntas" className="font-display text-2xl font-bold text-white">Preguntas frecuentes</h2>
            {p.faq.map((f) => (
              <details key={f.q} className="mt-3 rounded-xl border border-white/10 bg-[#0E1A40] p-4">
                <summary className="cursor-pointer font-semibold text-white">{f.q}</summary>
                <p className={`mt-2 ${gapCls(f.a)}`}><Inline text={f.a} /></p>
              </details>
            ))}
          </section>
        ) : null}
        {/* 9 · Cómo lo sabemos */}
        <aside aria-label="Cómo lo sabemos" className={`mt-12 text-sm text-[#A9B6D6] ${gapCls(p.comoLoSabemos)}`}>
          <p className="font-data mb-1 text-[11px] uppercase tracking-[0.25em]">Cómo lo sabemos</p>
          <p><Inline text={p.comoLoSabemos} /></p>
        </aside>
        {/* 13 · CTA única */}
        {m.ctaHref && (
          <div className="mt-12 rounded-3xl border border-[#008DFF]/45 bg-[#0E1A40] p-6 md:p-8">
            <p className="font-display text-2xl font-bold text-white">Te armamos tu viaje.</p>
            <p className="mt-2">Cuéntanos a dónde vas y cuántos días tienes. Un asesor de Travel Puzzle te propone tours y horarios a tu medida.</p>
            <a href={m.ctaHref} {...(p.cta.kind === 'whatsapp' ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="mt-5 inline-flex min-h-11 items-center gap-3 rounded-2xl bg-[#C12909] px-6 py-3 font-semibold text-white hover:opacity-90">{p.cta.label} →</a>
          </div>
        )}
        <div className="mt-8"><Share links={m.share} label="Compartir" /></div>
      </div>

      {/* Cierre: pilar, hermanos, anterior/siguiente y «Explora por destino» */}
      <nav aria-label="Más del blog" className="mx-auto mt-16 max-w-5xl space-y-10 px-4">
        <div className="flex flex-wrap gap-3">
          <Link href={m.pillar.href} className="inline-flex min-h-11 items-center rounded-full bg-[#008DFF] px-5 text-sm font-semibold text-white hover:bg-[#2EA0FF]">Guía: {m.pillar.name}</Link>
          <Link href={m.pillar.commercialHref} className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white hover:bg-white/10">{m.pillar.commercialLabel}</Link>
        </div>
        {m.siblings.length > 0 && (
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Sigue leyendo</h2>
            <div className={`mt-4 grid gap-4 ${m.siblings.length === 1 ? '' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>{m.siblings.map((s) => <PostCard key={s.href} p={s} featured={m.siblings.length === 1} />)}</div>
          </div>
        )}
        {(m.prev || m.next) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {m.prev ? <Link href={m.prev.href} className="rounded-xl border border-white/10 p-4 text-sm hover:bg-white/5"><span className="block text-[#7F8DB0]">← Anterior</span><span className="text-white">{m.prev.title}</span></Link> : <span />}
            {m.next && <Link href={m.next.href} className="rounded-xl border border-white/10 p-4 text-right text-sm hover:bg-white/5"><span className="block text-[#7F8DB0]">Siguiente →</span><span className="text-white">{m.next.title}</span></Link>}
          </div>
        )}
        {m.explore.length > 0 && (
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Explora por destino</h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {m.explore.map((g) => (
                <div key={g.href}>
                  <Link href={g.href} className="font-data text-xs uppercase tracking-[0.25em] text-[#008DFF] hover:underline">{g.name}</Link>
                  <ul className="mt-2 space-y-1 text-[15px]">
                    {g.posts.map((x) => <li key={x.href}>{x.current ? <span aria-current="page" className="font-semibold text-white">{x.title}</span> : <Link href={x.href} className="text-[#C9D6F5] hover:text-white hover:underline">{x.title}</Link>}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>
    </article>
  );
}
