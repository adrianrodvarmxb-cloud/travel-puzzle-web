import type { ReactNode } from 'react';
import type { MeetingView } from '@/ficha/lib/practical-view';

/**
 * REQ-10829 · Bloque 11 «Punto de encuentro y mapa» de la ficha única (decisión 28). Recibe solo la vista del punto
 * (ISP). El mapa llega como `children` (OCP/DIP): quien compone la ficha pasa el mapa de cliente; el bloque no carga
 * mapas ni lee banderas. Punto exacto → «Cómo llegar»; «Zona aproximada» → sin botón; sin vista, no pinta nada.
 */
export function PuntoEncuentroBlock({ view, text, children }: {
    view: MeetingView | null;
    text: { heading: string; directions: string; zone: string; zoneNote: string };
    children?: ReactNode;
}) {
    if (!view) return null;
    return (
        <section data-bloque="punto-de-encuentro" data-punto={view.kind} className="mb-8">
            <h2 className="mb-3 font-display text-xl font-bold text-white">{text.heading}</h2>
            {view.title && <p className="mb-3 font-medium text-[#E3E9F7]">{view.title}</p>}
            {view.kind !== 'text' && children}
            {view.kind === 'zone' && (
                <p className="mt-3 text-sm text-white/70">{text.zone}: {text.zoneNote}</p>
            )}
            {view.kind === 'exact' && (
                <a href={view.directionsUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#008DFF] px-5 py-3 font-semibold text-[#7CC4FF] hover:bg-[#008DFF] hover:text-white">
                    {text.directions} →
                </a>
            )}
        </section>
    );
}
