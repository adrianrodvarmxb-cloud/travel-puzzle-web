'use client';

import { useLanguage } from '@/lib/language-context';
import { DURATION_RANGES, durationLabel, type DurationRange } from '@/tours/lib/duration';

/** Filtros rápidos de duración: hasta 2 h, 2 a 4 h, más de 4 h. Tocar el activo lo quita. */
export function DurationFilter({ value, onChange }: { value: DurationRange | null; onChange: (v: DurationRange | null) => void }) {
  const { t, language } = useLanguage();
  return (
    <fieldset className="mt-4 rounded-2xl border border-white/10 bg-[#121D45] p-5">
      <legend className="sr-only">{t('tours.duration.label', 'Duration')}</legend>
      <p className="font-data mb-3 text-[11px] uppercase tracking-[0.2em] text-[#A9B6D6]">{t('tours.duration.label', 'Duration')}</p>
      <div className="flex flex-wrap gap-2">
        {DURATION_RANGES.map((r) => {
          const on = value === r;
          return (
            <button
              key={r}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? null : r)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${on ? 'border-[#EAF54F] bg-[#EAF54F] text-[#0A1330]' : 'border-white/20 text-white hover:border-white/50'}`}
            >
              {t(`tours.duration.${r}`, durationLabel(r, language))}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
