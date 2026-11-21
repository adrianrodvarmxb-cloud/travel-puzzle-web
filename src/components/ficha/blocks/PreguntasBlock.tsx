import type { FaqBlockView } from '@/ficha/lib/closing-view';

/**
 * REQ-10839 · Bloque 16 «Preguntas frecuentes» de la ficha única. Recibe solo la vista ya armada (ISP): preguntas con
 * datos reales de la ficha y la leyenda §K del abogado al cierre (REQ-10803). Sin vista no pinta nada; no lee banderas
 * ni base (DIP): FREETOUR y el mínimo de tres los decide `blocks.ts`.
 */
export function PreguntasBlock({ view }: { view: FaqBlockView | null }) {
    if (!view) return null;
    return (
        <section data-bloque="preguntas" className="mb-8">
            <h2 className="mb-3 font-display text-xl font-bold text-white">{view.heading}</h2>
            <div className="divide-y divide-white/10 rounded-xl border border-white/10">
                {view.items.map((it) => (
                    <details key={it.id} data-pregunta={it.id} className="group px-4 py-3">
                        <summary className="cursor-pointer list-none font-semibold text-white">{it.q}</summary>
                        <p className="mt-2 text-sm text-[#E3E9F7]">{it.a}</p>
                    </details>
                ))}
            </div>
            <p data-leyenda="k" className="mt-3 text-xs text-white/60">{view.legend}</p>
        </section>
    );
}
