import type { OtherExperiencesBlockView } from '@/ficha/lib/cross-sell-view';

/**
 * REQ-10847 · Bloque 20 «Otras experiencias en la ciudad» de la ficha única: tarjetas ya mezcladas 60/40 y con tope
 * por proveedor en `cross-sell-view.ts`. Recibe solo su vista (ISP); no lee banderas ni base (DIP).
 */
export function OtrasExperienciasBlock({ view }: { view: OtherExperiencesBlockView | null }) {
    if (!view) return null;
    return (
        <section data-bloque="otras-experiencias" className="mb-8">
            <h2 className="mb-3 font-display text-xl font-bold text-white">{view.heading}</h2>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {view.items.map((c) => (
                    <li key={c.id}>
                        <a href={c.href} data-experiencia className="block h-full rounded-xl border border-white/10 bg-white/5 p-4 text-white hover:border-white/30">
                            <span className="block font-semibold">{c.title}</span>
                            {c.priceText && <span className="block text-sm text-white/70">{c.priceText}</span>}
                        </a>
                    </li>
                ))}
            </ul>
        </section>
    );
}
