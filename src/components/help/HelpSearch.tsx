'use client';

import { useMemo, useState } from 'react';
import Link from '@/components/i18n/LocalizedLink';
import { useLanguage } from '@/lib/language-context';
import { faqTopics, helpCopy, searchFaq } from '@/help/lib/faq';
import { waLink } from '@/home/lib/copy';

type IconProps = { className?: string };
const Search = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className} aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
const ChevronDown = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="m6 9 6 6 6-6" /></svg>
);
const MessageCircle = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12z" /></svg>
);

/** Buscador y preguntas por tema. Solo presenta: preguntas y búsqueda vienen de help/lib. */
export function HelpSearch({ whatsapp }: { whatsapp?: string }) {
  const { language } = useLanguage();
  const c = helpCopy(language);
  const [query, setQuery] = useState('');

  const topics = useMemo(() => {
    return faqTopics(language)
      .map((t) => ({ ...t, items: searchFaq(t.items, query) }))
      .filter((t) => t.items.length > 0);
  }, [language, query]);

  const wa = waLink(whatsapp, c.waText);
  const searching = query.trim().length > 0;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 md:py-24">
      <p className="font-data mb-2.5 text-xs uppercase tracking-[0.3em] text-[#008DFF]">{c.eyebrow}</p>
      <h1 className="font-display text-4xl font-bold leading-[1.05] text-white md:text-5xl">{c.title}</h1>
      <p className="mt-4 text-lg text-[#A9B6D6]">{c.sub}</p>

      <label className="relative mt-8 block">
        <span className="sr-only">{c.search}</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#A9B6D6]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={c.search}
          className="w-full rounded-2xl border border-white/15 bg-white/5 py-4 pl-12 pr-4 text-base text-white placeholder:text-[#7F8DB0] focus:border-[#008DFF] focus:outline-none focus:ring-2 focus:ring-[#008DFF]/40"
        />
      </label>

      {!searching && (
        <nav aria-label={c.title} className="mt-6 flex flex-wrap gap-2">
          {topics.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-[#D5DCEE] hover:border-white/40 hover:text-white">
              {t.title}
            </a>
          ))}
        </nav>
      )}

      <div className="mt-10 space-y-10">
        {topics.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/5 p-5 text-[#D5DCEE]">{c.empty}</p>}
        {topics.map((t) => (
          <div key={t.id} id={t.id} className="scroll-mt-24">
            <h2 className="font-display text-2xl font-bold text-white">{t.title}</h2>
            <div className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
              {t.items.map((i) => (
                <details key={i.id} open={searching} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-semibold text-white [&::-webkit-details-marker]:hidden">
                    {i.q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-[#A9B6D6] transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-[15px] leading-relaxed text-[#D5DCEE]">{i.a}</p>
                  {i.link && (
                    <Link href={i.link.href} className="mt-2 inline-block text-sm font-semibold text-[#008DFF] hover:underline">
                      {i.link.label} →
                    </Link>
                  )}
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(0,141,255,0.18),rgba(234,245,79,0.06))] p-6 md:flex md:items-center md:justify-between md:gap-6">
        <div>
          <p className="font-display text-xl font-bold text-white">{c.stillTitle}</p>
          <p className="mt-1 text-[#A9B6D6]">{c.stillSub}</p>
        </div>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#EAF54F] px-5 py-3 font-semibold text-[#0A1330] hover:brightness-95 md:mt-0">
            <MessageCircle className="h-5 w-5" />
            {c.stillCta}
          </a>
        )}
      </div>
    </section>
  );
}
