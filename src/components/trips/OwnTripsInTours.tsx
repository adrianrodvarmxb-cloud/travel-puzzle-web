'use client';
import { useEffect, useState } from 'react';
import { PAGE_STEP, visibleSlice, nextVisible, hasMore } from '@/trips/lib/paging';
import { tripCopy } from '@/trips/lib/copy';
import { matchesToursFilter, visibleKindFilters, type ToursKindFilter } from '@/trips/lib/public';
import type { TripCard } from '@/trips/public-load';
import type { ExtraFilters } from '@/tours/lib/extra-filters';
import { ExperienceCard } from '@/components/tours/ExperienceCard';
import { fromTripCard } from '@/tours/lib/card-sources';

/** Filtro por tipo para /tours (gate L). */
export function ToursKindChips({ value, onChange, lang, kinds }: { value: ToursKindFilter; onChange: (k: ToursKindFilter) => void; lang: string; kinds: string[] }) {
    const c = tripCopy(lang);
    const label: Record<ToursKindFilter, string> = { all: c.filterAll, free: c.filterFree, tour: c.filterTour, circuito: c.filterCircuit, unica: c.filterExp, transporte: c.filterTransport };
    return (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Tipo">
            {visibleKindFilters(kinds).map((k) => (
                <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${value === k ? 'border-[#EAF54F] bg-[#EAF54F] text-[#0A1330]' : 'border-white/20 text-white hover:border-white/50'}`}>{label[k]}</button>
            ))}
        </div>
    );
}

/**
 * Viajes propios y de agencias primero (estilo Civitatis). REQ-520/526: con la tarjeta única ya no llevan la marca
 * «Recomendado por Travel Puzzle» sobre la foto (solo Favorito y categoría); OwnTripCard queda sin uso aquí.
 */
export function OwnTripsInTours({ trips, countryCode, kind, lang, search, cityName, minPrice, maxPrice, extra }: { trips: TripCard[]; countryCode: string | null; kind: ToursKindFilter; lang: string; search?: string; cityName?: string | null; minPrice?: number; maxPrice?: number; extra?: ExtraFilters }) {
    const c = tripCopy(lang);
    // REQ-046 (INC-004): también respetan el buscador, la ciudad y el precio.
    const list = trips.filter((t) => matchesToursFilter(t, { countryCode, kind, search, cityName, minPrice, maxPrice, ...extra }));
    // REQ-3501 (gate E): 24 al abrir y «Ver más» de 24 en 24; al cambiar filtros o búsqueda vuelve a 24.
    const [shown, setShown] = useState(PAGE_STEP);
    const filterKey = JSON.stringify([countryCode, kind, search, cityName, minPrice, maxPrice, extra]);
    useEffect(() => setShown(PAGE_STEP), [filterKey]);
    if (!list.length) return null;
    return (
        <div className="mb-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-2">
                {visibleSlice(list, shown).map((t, i) => <ExperienceCard key={t.id} card={fromTripCard(t, lang, c.from)} priority={i < 1} /* REQ-1564: en celular la 2.ª ya cae bajo el pliegue */ />)}
            </div>
            {hasMore(shown, list.length) && (
                <div className="mt-5 flex justify-center">
                    <button type="button" onClick={() => setShown(nextVisible(shown, list.length))} className="min-h-11 rounded-full border border-[#1B2A5E]/20 bg-white px-6 py-2.5 text-sm font-semibold text-[#1B2A5E] shadow-sm transition hover:bg-[#1B2A5E] hover:text-white">
                        {c.showMore} <span className="opacity-60">({shown} / {list.length})</span>
                    </button>
                </div>
            )}
        </div>
    );
}
