import type { ConditionsView } from '@/ficha/lib/conditions-view';

/**
 * REQ-10832 · Bloque 14 «Condiciones» de la ficha única: la única política de cancelación (decisión 34) y «Cómo
 * funciona tu reserva» con el plazo único de 48 horas hábiles (decisión 33). Recibe solo la vista ya armada (ISP);
 * los pasos llegan hechos, el bloque no lee banderas (DIP). Siempre sale; sin política, solo los pasos.
 */
export function CondicionesBlock({ view, text }: { view: ConditionsView; text: { heading: string; cancellation: string } }) {
    return (
        <section data-bloque="condiciones" className="mb-8">
            <h2 className="mb-3 font-display text-xl font-bold text-white">{text.heading}</h2>
            {view.cancellation && (
                <p data-cancelacion className="mb-4 text-[#E3E9F7]"><span className="font-semibold text-white">{text.cancellation}:</span> {view.cancellation}</p>
            )}
            {view.howSteps.length > 0 && (
                <div>
                    <h3 className="mb-2 font-semibold text-white">{view.howTitle}</h3>
                    <ol className="list-decimal space-y-1 pl-5 text-sm text-[#E3E9F7]">
                        {view.howSteps.map((s) => <li key={s}>{s}</li>)}
                    </ol>
                </div>
            )}
        </section>
    );
}
