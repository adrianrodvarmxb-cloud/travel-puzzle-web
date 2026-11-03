'use client';

import { useLanguage } from '@/lib/language-context';

/** Botón "Filtros" en celular: muestra u oculta el panel. */
export function MobileFiltersToggle({ open, onToggle, active }: { open: boolean; onToggle: () => void; active: number }) {
  const { t } = useLanguage();
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-[#121D45] px-4 py-3 font-semibold text-white lg:hidden">
      <span className="flex items-center gap-2">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
        {t('tours.filters.toggle', 'Filters')}{active > 0 && <span className="rounded-full bg-[#EAF54F] px-2 text-xs text-[#0A1330]">{active}</span>}
      </span>
      <span aria-hidden>{open ? '−' : '+'}</span>
    </button>
  );
}
