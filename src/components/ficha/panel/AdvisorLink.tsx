import type { AdvisorLinkView } from '@/ficha/lib/panel-view';

/**
 * REQ-10856 · Ayuda del panel: «Mila» en todas las fichas y el asesor por WhatsApp en FREETOUR (decisiones 42 y 43).
 * La liga ya lleva el contexto de la ficha (decisión 41). `compact` quita el título cuando va como acceso bajo otro
 * control. Recibe solo su vista (ISP); no decide Mila ni asesor (eso es de `panel-view.ts`).
 */
export function AdvisorLink({ view, compact = false }: { view: AdvisorLinkView | null; compact?: boolean }) {
    if (!view) return null;
    return (
        <div data-ayuda={view.kind}>
            {!compact && <p className="mb-2 font-display text-lg font-bold text-white">{view.title}</p>}
            <a href={view.href} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center rounded-xl bg-[#C12909] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#A32207]">
                {view.cta}
            </a>
        </div>
    );
}
