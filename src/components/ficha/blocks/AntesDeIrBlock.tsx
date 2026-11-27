import type { BeforeYouGoView } from '@/ficha/lib/conditions-view';

/**
 * REQ-10831 · Bloque 13 «Antes de ir» de la ficha única: qué llevar y requisitos. Recibe solo las dos listas ya limpias
 * y sus títulos (ISP); sin vista no pinta nada y cada lista vacía se omite. Sin hooks (DIP).
 */
export function AntesDeIrBlock({ view, text }: { view: BeforeYouGoView | null; text: { heading: string; bring: string; requirements: string } }) {
    if (!view) return null;
    const list = (title: string, items: string[], key: string) => items.length > 0 && (
        <div data-lista={key}>
            <h3 className="mb-2 font-semibold text-white">{title}</h3>
            <ul className="list-disc space-y-1 pl-5 text-[#E3E9F7]">
                {items.map((s) => <li key={s}>{s}</li>)}
            </ul>
        </div>
    );
    return (
        <section data-bloque="antes-de-ir" className="mb-8">
            <h2 className="mb-3 font-display text-xl font-bold text-white">{text.heading}</h2>
            <div className="grid gap-6 md:grid-cols-2">
                {list(text.bring, view.bring, 'llevar')}
                {list(text.requirements, view.requirements, 'requisitos')}
            </div>
        </section>
    );
}
