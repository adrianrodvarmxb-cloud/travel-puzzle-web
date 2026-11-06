'use client';

import { useEffect, useState } from 'react';
import type { TourEvent } from '@/lib/api/freetour-client';
import type { FxRates } from '@/trips/lib/money';
import { liveEventInfo, type LiveEventDetail } from '@/tours/lib/live-notice';

export interface PrimeraPiezaView {
    crumbs: { name: string; href: string }[];
    /** Del sync de hoy; se recalcula con el evento en vivo. */
    badge: string | null;
    notice: string[];
    operatedBy: string;
    isFreeTour: boolean;
    favorite: boolean;
    rates: FxRates | null;
}

/**
 * REQ-095…098: insignia (fuera de la foto), «Operado por un guía local · {proveedor}» y aviso por evento.
 * Primero se pinta lo del sync (igual en servidor y cliente); al cargar las salidas se consulta en vivo la
 * próxima y se recalculan insignia y aviso. Si la consulta falla, se queda lo del sync.
 */
export function PrimeraPiezaInfo({ view, events }: { view: PrimeraPiezaView; events: TourEvent[] }) {
    const [live, setLive] = useState<{ badge: string | null; notice: string[] } | null>(null);
    const next = events[0]?.id ?? null;

    useEffect(() => {
        if (!next) return;
        let off = false;
        fetch(`/api/freetour/event/${next}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((body: { data?: LiveEventDetail } | null) => {
                if (off || !body?.data?.fullPricePerGroup) return;
                setLive(liveEventInfo({ detail: body.data, isFreeTour: view.isFreeTour, rates: view.rates, lang: 'es' }));
            })
            .catch(() => { /* sin evento en vivo: se queda el aviso del sync */ });
        return () => { off = true; };
    }, [next, view.isFreeTour, view.rates]);

    const badge = live ? live.badge : view.badge;
    const notice = live ? live.notice : view.notice;
    return (
        <div className="mt-4 space-y-3">
            {(badge || view.favorite) && (
                <div className="flex flex-wrap gap-2">
                    {badge && <span className="rounded-md border border-[#7CC4FF]/60 px-2.5 py-1 text-xs font-semibold text-[#7CC4FF]">{badge}</span>}
                    {view.favorite && <span className="rounded-md bg-[#EAF54F] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[#0A1330]">★ Favorito de los viajeros</span>}
                </div>
            )}
            <p className="text-sm font-medium text-[#C9D6F5]">{view.operatedBy}</p>
            {notice.length > 0 && (
                <div className="max-w-3xl rounded-2xl border border-white/10 bg-[#121D45] p-4 text-sm leading-relaxed text-[#D5DCEE]">
                    {notice.map((l) => <p key={l}>{l}</p>)}
                </div>
            )}
        </div>
    );
}
