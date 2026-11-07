'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import { sortOptions, type TourSort } from '@/tours/lib/sort';
import { SearchSuggestList, useSearchSuggest } from '@/components/search/SearchSuggest';
import type { SuggestItem } from '@/search/suggest';
import { formatCount } from '@/home/lib/format';

interface ToursHeaderProps {
  total: number;
  lastUpdated?: string;
  search: string;
  onSearch: (value: string) => void;
  sort: TourSort;
  onSort: (sort: TourSort) => void;
  /** REQ-290: autocompletado (SEARCH_SUGGEST_ENABLED, la decide el servidor). Apagado = el buscador de siempre. */
  suggest?: boolean;
}

/** Encabezado oscuro de /tours: H1 = nombre del menú (REQ-174), buscador grande, conteo real y "Ordenar por". */
export function ToursHeader({ total, lastUpdated, search, onSearch, sort, onSort, suggest = false }: ToursHeaderProps) {
  const { t, language } = useLanguage();
  const [q, setQ] = useState(search);
  useEffect(() => setQ(search), [search]);
  // REQ-290/293: destino → se busca aquí mismo (REQ-122 lo filtra); tour o tipo de actividad → su página
  const pick = (item: SuggestItem) => {
    if (item.group === 'destination' || item.group === 'didYouMean') { setQ(item.label); onSearch(item.label); }
    else window.location.assign(item.href);
  };
  const s = useSearchSuggest(q, language, suggest, pick);
  // REQ-173 (INC-001): separador fijo, sin Intl del navegador.
  const count = formatCount(total, language === 'en' ? 'en' : 'es');

  return (
    <section className="border-b border-white/10">
      <div className="mx-auto max-w-[1280px] px-4 pb-10 pt-12 md:px-8 md:pt-16">
        <p className="font-data mb-3 text-xs uppercase tracking-[0.3em] text-[#EAF54F]">{t('tours.eyebrow', '{count} EXPERIENCES AVAILABLE').replace('{count}', count)}</p>
        <h1 className="font-display mb-6 text-4xl font-bold leading-[1.05] text-white md:text-6xl">{t('tours.headline', 'Experiences')}</h1>
        <form
          role="search"
          onSubmit={(e) => { e.preventDefault(); s.close(); onSearch(q.trim()); }}
          className="flex max-w-3xl flex-col gap-2 rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur-xl sm:flex-row"
        >
          <label htmlFor="tours-search" className="sr-only">{t('tours.filters.search')}</label>
          <div className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-white px-4 ${suggest ? 'relative' : ''}`}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#304A9F" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            {suggest ? (
              <input id="tours-search" value={q} onChange={(e) => { s.onInput(); setQ(e.target.value); }} onKeyDown={s.onKeyDown} onBlur={s.close}
                role="combobox" aria-expanded={s.open} aria-controls={s.listId} aria-autocomplete="list" aria-activedescendant={s.activeId} autoComplete="off"
                placeholder={t('tours.filters.searchPlaceholder')} className="min-w-0 flex-1 bg-transparent py-3.5 text-base text-[#0A1330] outline-none placeholder:text-gray-500" />
            ) : (
              <input id="tours-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('tours.filters.searchPlaceholder')} className="min-w-0 flex-1 bg-transparent py-3.5 text-base text-[#0A1330] outline-none placeholder:text-gray-500" />
            )}
            {suggest && <SearchSuggestList state={s} q={q} language={language} onPick={pick} />}
          </div>
          <button type="submit" className="rounded-xl bg-[#C12909] px-7 py-3.5 font-semibold text-white hover:opacity-90">{t('tours.searchCta', 'Search')} →</button>
        </form>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          {lastUpdated && <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[#7C8DBA]">{t('tours.lastUpdated')}: {lastUpdated}</p>}
          <label className="flex items-center gap-3 text-sm text-[#A9B6D6]">
            {t('tours.sort.label', 'Sort by')}
            <select
              value={sort}
              onChange={(e) => onSort(e.target.value as TourSort)}
              className="rounded-xl border border-white/20 bg-[#121D45] px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#008DFF]"
            >
              {sortOptions(sort === 'relevance' || !!search).map((o) => <option key={o} value={o}>{t(`tours.sort.${o}`)}</option>)}
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
