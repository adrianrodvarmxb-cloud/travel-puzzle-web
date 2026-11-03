'use client';

import { useLanguage } from '@/lib/language-context';

export type ToursView = 'list' | 'map';

/** Botón flotante para cambiar entre lista y mapa (celular y tablet; en escritorio se ven los dos). */
export function ViewToggle({ view, onChange }: { view: ToursView; onChange: (v: ToursView) => void }) {
  const { t } = useLanguage();
  const next: ToursView = view === 'list' ? 'map' : 'list';
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-[#0A1330] px-5 py-3 text-sm font-semibold text-white shadow-2xl ring-1 ring-white/20 hover:bg-[#121D45] xl:hidden"
    >
      {next === 'map' ? `🗺 ${t('tours.map.show', 'Map')}` : `☰ ${t('tours.map.list', 'List')}`}
    </button>
  );
}
