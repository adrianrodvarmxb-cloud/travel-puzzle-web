import type { TitleView } from '@/ficha/lib/title';

/**
 * REQ-10810 · Bloque 3 «Título, calificación y marca» de la ficha única. Solo pinta el `titleView` ya calculado
 * (ISP): título, nota y conteo si se muestran, y «Favorito» si lo gana. Nunca nombra al proveedor (la marca que vende
 * es Travel Puzzle). Sin hooks: sirve en servidor (DIP).
 */
export function TituloBlock({ view }: { view: TitleView }) {
    return (
        <header data-bloque="titulo" className="mb-6">
            {view.favorite && (
                <span className="mb-3 inline-flex items-center gap-1 rounded-md bg-[#EAF54F] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#0A1330] shadow-sm">
                    <span aria-hidden>★</span> {view.favorite}
                </span>
            )}
            <h1 className="font-display text-3xl font-bold leading-tight text-white md:text-4xl">{view.title}</h1>
            {view.rating && (
                <p className="mt-2 flex items-center gap-2 text-sm text-[#A9B6D6]">
                    <span aria-hidden className="text-[#EAF54F]">★</span>
                    <span className="font-semibold text-white">{view.rating.value}</span>
                    <span>({view.rating.reviews})</span>
                </p>
            )}
        </header>
    );
}
