'use client';
/**
 * REQ-291/292: salidas cuando una búsqueda no trae nada (tras SEARCH_SUGGEST_ENABLED) y nota de corrección cuando sí.
 * Cero resultados: «¿Quisiste decir…?», búsquedas con menos palabras (3 tours de vista previa; si solo una sirve,
 * se aplica sola), destinos populares, tipos de actividad y WhatsApp. Va dentro de SectionBoundary: si falla, se oculta.
 */
import { useEffect, useRef, useState } from 'react';
import { fill, suggestCopy, WHATSAPP_DISPLAY } from '@/search/lib/suggest-copy';
import type { RecoverResponse, SuggestItem, SuggestResponse } from '@/search/suggest';

const chip = 'inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-[#008DFF]';

function Chips({ items }: { items: SuggestItem[] }) {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-2">
      {items.map((x) => (
        <a key={x.href} href={x.href} className={chip}>
          <span>{x.label}</span>{x.hint && <span className="font-data text-[11px] text-[#7C8DBA]">{x.hint}</span>}
        </a>
      ))}
    </div>
  );
}

/** Cero resultados. `onApply(alt)` cambia la búsqueda sola cuando hay una única alternativa con resultados. */
export function SearchRecovery({ q, language, onApply }: { q: string; language: string; onApply: (alt: string, from: string) => void }) {
  const c = suggestCopy(language);
  const [data, setData] = useState<RecoverResponse | null>(null);
  const applied = useRef<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setData(null);
    fetch(`/api/search/recover?q=${encodeURIComponent(q)}&language=${encodeURIComponent(language)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<RecoverResponse>) : null))
      .then((body) => {
        if (!body) return;
        if (body.autoApply && applied.current !== q) { applied.current = q; onApply(body.autoApply, q); return; }
        setData(body);
      })
      .catch(() => { /* sin datos: queda el mensaje de siempre y WhatsApp */ });
    return () => ctrl.abort();
  }, [q, language, onApply]);

  const wa = data?.whatsapp;
  return (
    <div className="rounded-2xl border border-white/10 bg-[#121D45] px-6 py-10 text-center">
      <p className="font-display text-2xl font-semibold text-white">{fill(c.noResultsFor, { q })}</p>
      {data && data.didYouMean.length > 0 && (
        <section className="mt-6"><h2 className="text-sm font-semibold text-[#EAF54F]">{c.didYouMean}</h2><Chips items={data.didYouMean} /></section>
      )}
      {data && data.alternatives.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-[#EAF54F]">{c.tryWithout}</h2>
          <ul className="mx-auto mt-3 grid max-w-2xl gap-3 text-left">
            {data.alternatives.map((a) => (
              <li key={a.href} className="rounded-xl border border-white/10 p-4">
                <a href={a.href} className="flex items-baseline justify-between gap-3 font-semibold text-white hover:text-[#008DFF]">
                  <span>«{a.query}»</span><span className="font-data text-[11px] text-[#7C8DBA]">{c.seeAll}</span>
                </a>
                {a.tours.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-[#C9D6F5]">
                    {a.tours.map((t) => <li key={t.href} className="truncate"><a href={t.href} className="hover:text-white">{t.label}</a></li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {data && data.popular.length > 0 && (
        <section className="mt-6"><h2 className="text-sm font-semibold text-[#EAF54F]">{c.popular}</h2><Chips items={data.popular} /></section>
      )}
      {data && data.categories.length > 0 && (
        <section className="mt-6"><h2 className="text-sm font-semibold text-[#EAF54F]">{c.activityTypes}</h2><Chips items={data.categories} /></section>
      )}
      <section className="mt-8">
        <p className="text-[#A9B6D6]">{c.whatsappTitle}</p>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 font-semibold text-[#0A1330] hover:opacity-90">
            {c.whatsappCta} · <span className="font-data text-xs">{WHATSAPP_DISPLAY}</span>
          </a>
        )}
      </section>
    </div>
  );
}

/** Con resultados: «Mostrando resultados de Barcelona · buscaste Barselona», o «¿Quisiste decir…?» sin filtrar. */
export function SearchNote({ q, language, recoveredFrom }: { q: string; language: string; recoveredFrom: string | null }) {
  const c = suggestCopy(language);
  const [data, setData] = useState<SuggestResponse | null>(null);
  useEffect(() => {
    if (recoveredFrom) return;
    const ctrl = new AbortController();
    setData(null);
    fetch(`/api/search/suggest?q=${encodeURIComponent(q)}&language=${encodeURIComponent(language)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<SuggestResponse>) : null)).then(setData).catch(() => {});
    return () => ctrl.abort();
  }, [q, language, recoveredFrom]);

  if (recoveredFrom) return <p role="status" className="mb-4 rounded-xl border border-white/10 bg-[#121D45] px-4 py-3 text-sm text-[#C9D6F5]">{fill(c.showingInstead, { q: recoveredFrom, alt: q })}</p>;
  if (!data) return null;
  const dym = data.items.filter((x) => x.group === 'didYouMean');
  if (data.corrected && data.correctedLabel) {
    return (
      <p role="status" className="mb-4 rounded-xl border border-white/10 bg-[#121D45] px-4 py-3 text-sm text-[#C9D6F5]">
        <strong className="text-white">{fill(c.showingFor, { q: data.correctedLabel })}</strong> · {fill(c.youSearched, { q })}
      </p>
    );
  }
  if (!dym.length) return null;
  return (
    <p role="status" className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#121D45] px-4 py-3 text-sm text-[#C9D6F5]">
      {c.didYouMean}
      {dym.map((x) => <a key={x.href} href={x.href} className="font-semibold text-white underline decoration-[#008DFF] underline-offset-4">{x.label}</a>)}
    </p>
  );
}
