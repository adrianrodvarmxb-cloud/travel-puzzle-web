import type { ImportantInfoView } from '@/ficha/lib/conditions-view';

/**
 * REQ-10833 · Bloque 15 «Información importante» de la ficha única: notas del proveedor y la línea discreta «Opera en
 * destino: …» (decisión 38), igual para todos. Recibe solo la vista (ISP); sin vista no pinta nada. Sin hooks (DIP).
 */
export function InfoImportanteBlock({ view, heading }: { view: ImportantInfoView | null; heading: string }) {
    if (!view) return null;
    return (
        <section data-bloque="informacion-importante" className="mb-8">
            <h2 className="mb-3 font-display text-xl font-bold text-white">{heading}</h2>
            {view.notes.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-[#E3E9F7]">
                    {view.notes.map((s) => <li key={s}>{s}</li>)}
                </ul>
            )}
            {view.operatorLine && <p data-opera className="mt-3 text-sm text-white/60">{view.operatorLine}</p>}
        </section>
    );
}
