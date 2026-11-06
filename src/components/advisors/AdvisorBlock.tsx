import { SectionBoundary } from '@/components/common/SectionBoundary';
import { DarkCard } from '@/components/site/PageHeader';
import { AdvisorForm } from './AdvisorForm';
import type { AdvisorBlock as Block, AdvisorCopy } from '@/advisors/lib/copy';

/** REQ-250: bloque «Habla con un asesor de viaje»: WhatsApp del asesor + formulario corto. Reutilizable en otras páginas. */
export function AdvisorBlock({ c, blocks, lang, wa }: { c: AdvisorCopy; blocks: Block[]; lang: string; wa: { href: string; display: string } | null }) {
  return (
    <section id="asesor" className="mx-auto grid max-w-5xl scroll-mt-24 gap-6 px-4 pb-16 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        {wa && (
          <div className="rounded-2xl border border-[#008DFF]/45 bg-[#0E1A40] p-6">
            <h2 className="font-display text-xl font-bold text-white">{c.wa.title}</h2>
            <p className="mt-2 text-[15px] text-[#C9D6F5]">{c.wa.text}</p>
            <p className="font-data mt-3 text-sm text-white">{wa.display}</p>
            <p className="text-xs text-[#A9B6D6]">{c.wa.hours}</p>
            <a href={wa.href} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-3 rounded-2xl bg-[#C12909] px-5 py-3 font-semibold text-white hover:opacity-90">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/social/whatsapp.png" alt="" width={24} height={24} className="rounded-full" />
              {c.wa.cta} →
            </a>
          </div>
        )}
        {blocks.map((b) => (
          <DarkCard key={b.id} title={b.title}>
            <ol className="mt-1 space-y-3">
              {b.items.map((it, i) => (
                <li key={it.title} className="flex gap-3">
                  <span className="font-data mt-0.5 text-xs text-[#EAF54F]">{String(i + 1).padStart(2, '0')}</span>
                  <span><strong className="block text-white">{it.title}</strong>{it.text}</span>
                </li>
              ))}
            </ol>
          </DarkCard>
        ))}
      </div>
      <div className="lg:col-span-3">
        <SectionBoundary name="asesor-formulario">
          <AdvisorForm c={c.form} lang={lang} waHref={wa?.href ?? null} />
        </SectionBoundary>
      </div>
    </section>
  );
}
