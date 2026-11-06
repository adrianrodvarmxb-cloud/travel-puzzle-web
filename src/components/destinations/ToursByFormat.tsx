'use client';

import { useState } from 'react';
import type { TourCardModel } from '@/destinations/lib/catalog';
import type { FxRates } from '@/trips/lib/money';
import { TourGrid } from './DestinationTourCard';

/**
 * T5 (REQ-414, REQ-412): chips de formato dentro de «Tours» de la ciudad. Filtran en la página sin cambiar la URL
 * (no hay rutas /{formato}); solo se pintan formatos con tours. Sin chips (o con uno solo), la cuadrícula de siempre.
 */
export function ToursByFormat({ tours, chips, rates = null }: { tours: TourCardModel[]; chips: { slug: string; label: string; count: number }[]; rates?: FxRates | null }) {
    const [on, setOn] = useState<string | null>(null);
    const shown = on ? tours.filter((t) => t.formato === on) : tours;
    return (
        <>
            {chips.length > 1 && (
                <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Tipo de experiencia">
                    <button type="button" aria-pressed={on === null} onClick={() => setOn(null)}
                        className={`min-h-9 rounded-full border px-3 text-sm ${on === null ? 'border-sky-400 bg-sky-500/20 text-white' : 'border-white/20 text-[#C9D6F5]'}`}>
                        Todos ({tours.length})
                    </button>
                    {chips.map((c) => (
                        <button key={c.slug} type="button" aria-pressed={on === c.slug} onClick={() => setOn(on === c.slug ? null : c.slug)}
                            className={`min-h-9 rounded-full border px-3 text-sm ${on === c.slug ? 'border-sky-400 bg-sky-500/20 text-white' : 'border-white/20 text-[#C9D6F5]'}`}>
                            {c.label} ({c.count})
                        </button>
                    ))}
                </div>
            )}
            <TourGrid tours={shown} rates={rates} />
        </>
    );
}
