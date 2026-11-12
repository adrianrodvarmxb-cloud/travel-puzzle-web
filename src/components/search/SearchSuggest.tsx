'use client';
/**
 * REQ-290/291/293: autocompletado agrupado bajo el buscador de /tours (tras SEARCH_SUGGEST_ENABLED).
 * Desde 3 caracteres con debounce de 250 ms; flechas, Inicio/Fin, Enter y Escape; patrón combobox de WAI-ARIA.
 * Máx. 10 en escritorio y 6 en celular. Render determinista: sin Intl, fechas ni azar al pintar (INC-001).
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { DEBOUNCE_MS, MAX_ITEMS_MOBILE, cleanQuery, highlight, nextActive } from '@/search/lib/suggest';
import { suggestCopy } from '@/search/lib/suggest-copy';
import type { SuggestGroup, SuggestItem, SuggestResponse } from '@/search/suggest';

const ORDER: SuggestGroup[] = ['didYouMean', 'destination', 'tour', 'trip', 'category']; // REQ-1615

export interface SuggestState {
  items: SuggestItem[];
  open: boolean;
  active: number;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  /** se llama al escribir: el valor que llega de la URL no abre la lista */
  onInput: () => void;
  close: () => void;
  listId: string;
  activeId: string | undefined;
}

/** Pide sugerencias para `q` y maneja el teclado. `onPick` recibe el elemento elegido. */
export function useSearchSuggest(q: string, language: string, enabled: boolean, onPick: (item: SuggestItem) => void): SuggestState {
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const typed = useRef(false);
  const listId = 'tours-search-suggestions';

  useEffect(() => {
    if (!enabled) return;
    const clean = cleanQuery(q);
    if (!clean || !typed.current) { setItems([]); setOpen(false); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(clean)}&language=${encodeURIComponent(language)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? (r.json() as Promise<SuggestResponse>) : null))
        .then((body) => {
          const list = (body?.items ?? []).slice().sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group));
          setItems(list); setActive(-1); setOpen(list.length > 0);
        })
        .catch(() => { /* sin sugerencias: el buscador sigue igual */ });
    }, DEBOUNCE_MS);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [q, language, enabled]);

  const close = () => { setOpen(false); setActive(-1); };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!enabled || !open || !items.length) return;
    if (e.key === 'Enter' && active >= 0) { e.preventDefault(); onPick(items[active]); close(); return; }
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) { e.preventDefault(); setActive((a) => nextActive(a, e.key, items.length)); }
  };
  return { items, open: enabled && open, active, onKeyDown, onInput: () => { typed.current = true; }, close, listId, activeId: active >= 0 ? `${listId}-${active}` : undefined };
}

/** Lista desplegable agrupada. Resalta lo que falta por escribir. */
export function SearchSuggestList({ state, q, language, onPick }: { state: SuggestState; q: string; language: string; onPick: (item: SuggestItem) => void }) {
  const c = suggestCopy(language);
  if (!state.open) return null;
  const heading: Record<SuggestGroup, string> = { didYouMean: c.didYouMean, destination: c.destinations, tour: c.tours, trip: c.trips, category: c.categories };
  let last: SuggestGroup | null = null;
  return (
    <ul id={state.listId} role="listbox" aria-label={c.listLabel}
      className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-auto rounded-2xl border border-white/15 bg-[#0F1A3D] py-2 text-left shadow-2xl">
      {state.items.map((item, i) => {
        const showHeading = item.group !== last;
        last = item.group;
        const mobileHidden = i >= MAX_ITEMS_MOBILE ? 'hidden md:block' : '';
        return (
          <li key={`${item.group}-${item.href}`} className={mobileHidden} role="presentation">
            {showHeading && <p className="font-data px-4 pb-1 pt-3 text-[10px] uppercase tracking-[0.2em] text-[#7C8DBA]">{heading[item.group]}</p>}
            <a id={`${state.listId}-${i}`} role="option" aria-selected={state.active === i} href={item.href}
              onMouseDown={(e) => { e.preventDefault(); onPick(item); state.close(); }}
              className={`flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm text-white ${state.active === i ? 'bg-white/10' : 'hover:bg-white/5'}`}>
              <span className="min-w-0 truncate">
                {highlight(item.label, item.group === 'didYouMean' ? '' : q).map((s, k) => (s.strong ? <strong key={k} className="font-semibold">{s.text}</strong> : <span key={k} className="text-[#C9D6F5]">{s.text}</span>))}
              </span>
              {item.hint && <span className="font-data shrink-0 text-[11px] text-[#7C8DBA]">{item.hint}</span>}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
