'use client';
import { tripCopy } from '@/trips/lib/copy';
import { matchesToursFilter, type ToursKindFilter } from '@/trips/lib/public';
import type { TripCard } from '@/trips/public-load';
import { OwnTripCard } from './OwnTripCard';

const KINDS: ToursKindFilter[] = ['all', 'free', 'tour', 'circuito', 'unica'];

/** Filtro por tipo para /tours (gate L). */
export function ToursKindChips({ value, onChange, lang }: { value: ToursKindFilter; onChange: (k: ToursKindFilter) => void; lang: string }) {
    const c = tripCopy(lang);
    const label: Record<ToursKindFilter, string> = { all: c.filterAll, free: c.filterFree, tour: c.filterTour, circuito: c.filterCircuit, unica: c.filterExp };
    return (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Tipo">
            {KINDS.map((k) => (
                <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${value === k ? 'border-[#EAF54F] bg-[#EAF54F] text-[#0A1330]' : 'border-white/20 text-white hover:border-white/50'}`}>{label[k]}</button>
            ))}
        </div>
    );
}

/** Viajes propios y de agencias primero, marcados "Recomendado por Travel Puzzle" (estilo Civitatis). */
export function OwnTripsInTours({ trips, countryCode, kind, lang }: { trips: TripCard[]; countryCode: string | null; kind: ToursKindFilter; lang: string }) {
    const c = tripCopy(lang);
    const list = trips.filter((t) => matchesToursFilter(t, { countryCode, kind }));
    if (!list.length) return null;
    return (
        <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-2">
            {list.map((t) => <OwnTripCard key={t.id} trip={t} c={c} lang={lang} marked />)}
        </div>
    );
}
