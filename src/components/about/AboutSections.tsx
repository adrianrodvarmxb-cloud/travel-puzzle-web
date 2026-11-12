import Link from '@/components/i18n/LocalizedLink';
import { SectionHeading } from '@/components/home/v2/SectionHeading';
import { ProofStrip, type ProofCounts } from '@/components/home/v2/ProofStrip';
import { SectionBoundary } from '@/components/common/SectionBoundary';
import { DarkCard } from '@/components/site/PageHeader';
import { aboutSectionsToShow, type AboutSection } from '@/about/lib/content';
import type { PublicStats } from '@/about/lib/public-stats';

const n = (i: number) => String(i + 1).padStart(2, '0');

/** REQ-243: pinta solo las secciones visibles (ya filtradas en el servidor); numera sin saltos. */
export function AboutSections({ sections, stats, counts }: { sections: AboutSection[]; stats: PublicStats | null; counts: ProofCounts | null }) {
  const shown = aboutSectionsToShow(sections, stats);
  return (
    <>
      {shown.map((s, i) => {
        const eyebrow = `${n(i)} — ${s.eyebrow.toUpperCase()}`;
        switch (s.kind) {
          case 'cards':
            return (
              <section key={s.id} id={s.id} className="mx-auto max-w-5xl scroll-mt-24 px-4 py-12">
                <SectionHeading eyebrow={eyebrow} title={s.title} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {s.cards.map((c) => (
                    <DarkCard key={c.title} title={c.title}>
                      <p>{c.text}</p>
                      {c.link && <Link href={c.link.href} className="mt-3 inline-block text-sm font-semibold text-[#EAF54F] underline-offset-4 hover:underline">{c.link.label} →</Link>}
                    </DarkCard>
                  ))}
                </div>
              </section>
            );
          case 'stats':
            return (
              <section key={s.id} id={s.id} className="scroll-mt-24 py-12">
                <div className="mx-auto max-w-5xl px-4"><SectionHeading eyebrow={eyebrow} title={s.title} /></div>
                <SectionBoundary name="nosotros-cifras"><ProofStrip stats={stats!} counts={counts!} /></SectionBoundary>
              </section>
            );
          case 'facts':
            return (
              <section key={s.id} id={s.id} className="mx-auto max-w-5xl scroll-mt-24 px-4 py-12">
                <SectionHeading eyebrow={eyebrow} title={s.title} subtitle={s.intro} />
                <dl className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-[#0E1A40]">
                  {s.rows.map((r) => (
                    <div key={r.label} className="grid gap-1 px-5 py-4 sm:grid-cols-3 sm:gap-4">
                      <dt className="font-data text-[11px] uppercase tracking-[0.2em] text-[#A9B6D6]">{r.label}</dt>
                      <dd className="text-white sm:col-span-2">{r.value}</dd>
                    </div>
                  ))}
                </dl>
                <Link href={s.link.href} className="mt-4 inline-block text-sm font-semibold text-[#EAF54F] underline-offset-4 hover:underline">{s.link.label} →</Link>
              </section>
            );
          case 'story':
            return (
              <section key={s.id} id={s.id} className="mx-auto max-w-5xl scroll-mt-24 px-4 py-12">
                <SectionHeading eyebrow={eyebrow} title={s.title} />
                <div className="max-w-[68ch] space-y-4 text-[17px] leading-[1.7] text-[#C9D6F5]">
                  {s.paragraphs.map((p) => <p key={p}>{p}</p>)}
                </div>
              </section>
            );
          case 'quote':
            return (
              <section key={s.id} id={s.id} className="mx-auto max-w-5xl px-4 py-12">
                <blockquote className="font-display border-l-4 border-[#EAF54F] pl-6 text-2xl italic leading-snug text-white md:text-3xl">{s.text}</blockquote>
              </section>
            );
          case 'team':
            return (
              <section key={s.id} id={s.id} className="mx-auto max-w-5xl scroll-mt-24 px-4 py-12">
                <SectionHeading eyebrow={eyebrow} title={s.title} />
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {s.members.map((m) => <li key={m.name}><DarkCard title={m.name}><p>{m.role}</p></DarkCard></li>)}
                </ul>
              </section>
            );
        }
      })}
    </>
  );
}
