'use client';
import { DURATION_STOPS, durationStopLabel } from '@/tours/lib/filters-copy';

const LAST = DURATION_STOPS.length - 1;
const idx = (min: number | null, fallback: number) => (min === null ? fallback : Math.max(0, DURATION_STOPS.findIndex((s) => s >= min)));

/** REQ-056: deslizador doble de duración (0 h a 31 días). Los extremos equivalen a "sin límite". */
export function DurationSlider({ min, max, lang, onChange }: { min: number | null; max: number | null; lang: string; onChange: (min: number | null, max: number | null) => void }) {
    const a = idx(min, 0), b = idx(max, LAST);
    const set = (na: number, nb: number) => onChange(na <= 0 ? null : DURATION_STOPS[na], nb >= LAST ? null : DURATION_STOPS[nb]);
    return (
        <div>
            <div className="mb-2 flex justify-between text-sm text-[#DCE4F5]"><span>{durationStopLabel(DURATION_STOPS[a], lang)}</span><span>{durationStopLabel(DURATION_STOPS[b], lang)}{b === LAST ? '+' : ''}</span></div>
            <div className="relative h-8">
                <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded bg-white/15" />
                <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded bg-[#EAF54F]" style={{ left: `${(a / LAST) * 100}%`, right: `${100 - (b / LAST) * 100}%` }} />
                <input aria-label="min" type="range" min={0} max={LAST} value={a} onChange={(e) => set(Math.min(Number(e.target.value), b), b)} className="tp-range absolute inset-0 w-full" />
                <input aria-label="max" type="range" min={0} max={LAST} value={b} onChange={(e) => set(a, Math.max(Number(e.target.value), a))} className="tp-range absolute inset-0 w-full" />
            </div>
        </div>
    );
}
