import type { GuaranteesBlockView } from '@/ficha/lib/guarantees';

/**
 * REQ-10848 / REQ-10804 / REQ-10796 · Bloque 21 «Garantías y pie» de la ficha única (decisión 49): las garantías específicas del
 * tipo de experiencia (§L literal) si las tiene, la cláusula de no-show §G en los tours con costo y, siempre, el enlace a Términos y condiciones. Recibe solo su vista
 * (ISP); no lee banderas (DIP).
 */
export function GarantiasBlock({ view }: { view: GuaranteesBlockView }) {
    return (
        <section data-bloque="garantias" className="mb-8 border-t border-white/10 pt-6">
            {view.items.length > 0 && (
                <>
                    <h2 className="mb-3 font-display text-xl font-bold text-white">{view.heading}</h2>
                    <ul className="mb-4 space-y-2 text-[#E3E9F7]">
                        {view.items.map((g) => <li key={g.id} data-garantia={g.id}>{g.text}</li>)}
                    </ul>
                </>
            )}
            {view.noShow && (
                <div data-no-show className="mb-4">
                    <h3 className="mb-2 font-display text-base font-bold text-white">{view.noShow.heading}</h3>
                    <p lang="es" className="text-sm text-[#E3E9F7]">{view.noShow.text}</p>
                </div>
            )}
            <a href={view.termsHref} data-terminos className="text-sm text-[#008DFF] underline">{view.termsLabel}</a>
        </section>
    );
}
