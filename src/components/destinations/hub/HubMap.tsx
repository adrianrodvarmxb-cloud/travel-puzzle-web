'use client';

import dynamic from 'next/dynamic';
import { destinosHubCopy } from '@/destinations/lib/destinos-hub-copy';

// El mapa (y su librería) solo se carga en el navegador; es el mismo del inicio.
const WorldMap = dynamic(() => import('@/components/map/WorldMap').then((m) => m.WorldMap), { ssr: false });

/** REQ-3475 (gate A): el mapa del mundo con pines agrupados, después de «Más buscados». */
export function HubMap({ lang }: { lang: string }) {
    const c = destinosHubCopy(lang);
    return (
        <section aria-labelledby="mapa-destinos" className="mt-14">
            <h2 id="mapa-destinos" className="font-display text-2xl font-bold text-white md:text-3xl">{c.mapTitle}</h2>
            <p className="mb-5 mt-1 text-sm text-[#A9B6D6]">{c.mapSub}</p>
            <WorldMap />
        </section>
    );
}
