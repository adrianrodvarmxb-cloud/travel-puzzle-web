import { Inline } from '@/components/blog/Inline';
import type { CityGuide, LocalizedGuide } from '@/destinations/lib/guia';
import { formatDate } from '@/blog/lib/dates';

// REQ-3336: rótulos de la guía por idioma (la guía en inglés nunca muestra textos en español).
const LABELS = {
  es: { byline: 'Equipo editorial de Travel Puzzle', brief: 'En breve', how: 'Cómo lo sabemos' },
  en: { byline: 'Travel Puzzle editorial team', brief: 'In short', how: 'How we know' },
} as const;

/**
 * REQ-1230: guía propia de la ciudad con la plantilla del blog adaptada (respuesta primero, H2 en pregunta con su
 * respuesta, fuentes enlazadas). Sin hooks: se pinta en el servidor. Recibe solo la guía (ISP).
 * REQ-3336: acepta la guía ya localizada (guideIn); una guía sin idioma se pinta en español.
 */
export function CityGuideView({ g }: { g: CityGuide | LocalizedGuide }) {
  const lang = 'lang' in g ? g.lang : 'es';
  const l = LABELS[lang];
  return (
    <article className="mt-4 max-w-3xl text-[17px] leading-[1.7] text-[#C9D6F5]">
      <p className="text-sm text-[#7F8DB0]">{l.byline} · {formatDate(g.publishedAt, lang)}</p>
      <aside aria-label={l.brief} className="mt-4 rounded-2xl border-l-4 border-[#EAF54F] bg-[#0E1A40] p-5">
        <p className="font-data mb-1 text-[11px] uppercase tracking-[0.25em] text-[#EAF54F]">{l.brief}</p>
        <p className="text-white"><Inline text={g.enBreve} /></p>
      </aside>
      {g.sections.map((s) => (
        <section key={s.h2}>
          <h3 className="font-display mt-10 text-xl font-bold leading-snug text-white md:text-2xl">{s.h2}</h3>
          <p className="mt-3 font-medium text-white"><Inline text={s.answer} /></p>
          {s.body.map((b) => <p key={b} className="mt-4"><Inline text={b} /></p>)}
          {s.list && <ul className="mt-4 list-disc space-y-1 pl-6">{s.list.map((li) => <li key={li}><Inline text={li} /></li>)}</ul>}
        </section>
      ))}
      <aside aria-label={l.how} className="mt-10 text-sm text-[#A9B6D6]">
        <p className="font-data mb-1 text-[11px] uppercase tracking-[0.25em]">{l.how}</p>
        <p><Inline text={g.comoLoSabemos} /></p>
      </aside>
    </article>
  );
}
