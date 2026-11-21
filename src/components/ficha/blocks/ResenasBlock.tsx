import { ReviewCard } from '@/components/reviews/ReviewCard';
import type { ReviewsBlockView } from '@/ficha/lib/closing-view';

/**
 * REQ-10841 · Bloque 18 «Reseñas» de la ficha única: solo las del proveedor de la ficha y las propias de Travel Puzzle
 * (moderadas), sin las que nombran la plataforma; proveedor con nota oculta (Tangol, decisión 18), sin conteo. Recibe
 * solo su vista (ISP) y el idioma; reusa `ReviewCard` por composición (OCP). Sin vista no pinta nada.
 */
export function ResenasBlock({ view, language }: { view: ReviewsBlockView | null; language: string }) {
    if (!view) return null;
    return (
        <section data-bloque="resenas" id="resenas" className="mb-8 scroll-mt-24">
            <h2 className="mb-1 font-display text-xl font-bold text-white">{view.heading}</h2>
            {view.totalText && <p data-conteo className="mb-4 text-sm text-white/60">{view.totalText}</p>}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {view.items.map((r) => <ReviewCard key={r.id} review={r} language={language} />)}
            </div>
        </section>
    );
}
