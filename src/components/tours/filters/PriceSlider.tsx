'use client';
import { priceStopLabel } from '@/tours/lib/price-filter';
/** REQ-056: deslizador doble de precio (como Civitatis). Los extremos equivalen a "sin límite". */
export const PRICE_STOPS = [0, 10, 25, 50, 100, 200, 500, 1000, 2000] as const;
const LAST = PRICE_STOPS.length - 1;
const idx = (v: number | undefined, fallback: number) => (v === undefined ? fallback : Math.max(0, PRICE_STOPS.findIndex((s) => s >= v)));

/** REQ-1254: los topes son EUR (la moneda con la que filtra el catálogo), con MXN aproximado como las tarjetas. */
export function PriceSlider({ min, max, onChange, mxnPerEur = null, lang = 'es' }: { min?: number; max?: number; onChange: (min: number | undefined, max: number | undefined) => void; mxnPerEur?: number | null; lang?: string }) {
    const a = idx(min, 0), b = idx(max, LAST);
    const set = (na: number, nb: number) => onChange(na <= 0 ? undefined : PRICE_STOPS[na], nb >= LAST ? undefined : PRICE_STOPS[nb]);
    return (
        <div>
            <div className="mb-2 flex justify-between text-sm text-[#DCE4F5]"><span>{priceStopLabel(PRICE_STOPS[a], false, mxnPerEur, lang)}</span><span className="text-right">{priceStopLabel(PRICE_STOPS[b], b === LAST, mxnPerEur, lang)}</span></div>
            <div className="relative h-8">
                <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded bg-white/15" />
                <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded bg-[#EAF54F]" style={{ left: `${(a / LAST) * 100}%`, right: `${100 - (b / LAST) * 100}%` }} />
                <input aria-label="min" type="range" min={0} max={LAST} value={a} onChange={(e) => set(Math.min(Number(e.target.value), b), b)} className="tp-range absolute inset-0 w-full" />
                <input aria-label="max" type="range" min={0} max={LAST} value={b} onChange={(e) => set(a, Math.max(Number(e.target.value), a))} className="tp-range absolute inset-0 w-full" />
            </div>
        </div>
    );
}
