'use client';
import type { ExtraFilters } from '@/tours/lib/extra-filters';
import { CATEGORY_GROUPS, groupLabel } from '@/tours/lib/extra-filters';
import { filtersCopy, guideLanguageName } from '@/tours/lib/filters-copy';
import { GUIDE_LANGUAGE_OPTIONS } from '@/departures/lib/params';
import { addDays, HORIZON_DAYS } from '@/departures/lib/summary';
import { FilterSection, FilterCheck } from './FilterSection';
import { DurationSlider } from './DurationSlider';
import { PriceSlider } from './PriceSlider';

/** REQ-049..056: filtros estilo Civitatis (tipo, características, idioma, fecha, duración). */
export function MoreFilters({ value, onChange, today, lang, price, onPrice, priceLabel }: { value: ExtraFilters; onChange: (v: ExtraFilters) => void; today: string; lang: string; price?: { min?: number; max?: number }; onPrice?: (min: number | undefined, max: number | undefined) => void; priceLabel?: string }) {
    const c = filtersCopy(lang);
    const set = (patch: Partial<ExtraFilters>) => onChange({ ...value, ...patch });
    const toggleGroup = (id: string, on: boolean) => set({ groups: on ? [...value.groups, id] : value.groups.filter((g) => g !== id) });
    const input = 'w-full rounded-xl border border-white/20 bg-[#0E1A40] px-3 py-2.5 text-[15px] text-white outline-none focus:border-[#008DFF]';
    return (
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#121D45] p-5">
            <FilterSection title={c.type}>
                {CATEGORY_GROUPS.map((g) => <FilterCheck key={g.id} label={groupLabel(g.id, lang)} checked={value.groups.includes(g.id)} onChange={(on) => toggleGroup(g.id, on)} />)}
            </FilterSection>
            <FilterSection title={c.features}>
                <FilterCheck label={c.freeCancel} checked={value.freeCancel} onChange={(v) => set({ freeCancel: v })} />
                <FilterCheck label={c.private} checked={value.privateOnly} onChange={(v) => set({ privateOnly: v })} />
                <FilterCheck label={c.pickup} checked={value.hotelPickup} onChange={(v) => set({ hotelPickup: v })} />
                <FilterCheck label={c.novelty} checked={value.novelty} onChange={(v) => set({ novelty: v })} />
            </FilterSection>
            <FilterSection title={c.language}>
                <select aria-label={c.language} value={value.guideLanguage ?? ''} onChange={(e) => set({ guideLanguage: e.target.value || null })} className={input}>
                    <option value="">{c.anyLanguage}</option>
                    {GUIDE_LANGUAGE_OPTIONS.map((l) => <option key={l} value={l}>{guideLanguageName(l, lang)}</option>)}
                </select>
            </FilterSection>
            <FilterSection title={c.date}>
                <input type="date" aria-label={c.date} value={value.date ?? ''} min={today} max={addDays(today, HORIZON_DAYS - 1)} onChange={(e) => set({ date: e.target.value || null })} className={`${input} [color-scheme:dark]`} />
            </FilterSection>
            {onPrice && (
                <FilterSection title={priceLabel ?? 'Precio'}>
                    <PriceSlider min={price?.min} max={price?.max} onChange={onPrice} />
                </FilterSection>
            )}
            <FilterSection title={c.duration}>
                <DurationSlider min={value.durMin} max={value.durMax} lang={lang} onChange={(durMin, durMax) => set({ durMin, durMax })} />
            </FilterSection>
        </div>
    );
}
