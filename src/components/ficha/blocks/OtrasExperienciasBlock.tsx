import { imgLoading, transformedSrc } from '@/perf/lib/image';
import type { OtherExperiencesBlockView } from '@/ficha/lib/cross-sell-view';
import { LocalPrice } from '../panel/LocalPrice';

/**
 * REQ-10847 · Bloque 20 «Otras experiencias en la ciudad» de la ficha única: tarjetas ya mezcladas 60/40 y con tope
 * por proveedor en `cross-sell-view.ts`. Recibe solo su vista (ISP); no lee banderas ni base (DIP).
 * REQ-10862: con datos reales la tarjeta lleva la foto (bajo el pliegue, carga diferida) y el precio público «Desde».
 * REQ-10893: con `localUrl`, `LocalPrice` actualiza el «Desde» en el navegador con la moneda del visitante (como el panel).
 */
export function OtrasExperienciasBlock({ view }: { view: OtherExperiencesBlockView | null }) {
    if (!view) return null;
    return (
        <section data-bloque="otras-experiencias" className="mb-8">
            <h2 className="mb-3 font-display text-xl font-bold text-white">{view.heading}</h2>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {view.items.map((c) => (
                    <li key={c.id}>
                        <a href={c.href} data-experiencia className="block h-full overflow-hidden rounded-xl border border-white/10 bg-white/5 text-white hover:border-white/30">
                            {c.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={transformedSrc(c.imageUrl, 640)} alt="" {...imgLoading(false)} className="h-36 w-full object-cover" />
                            )}
                            <span className="block p-4">
                                <span className="block font-semibold">{c.title}</span>
                                {c.priceText && (
                                    <span className="block text-sm text-white/70">
                                        {c.localUrl ? <LocalPrice text={c.priceText} localUrl={c.localUrl} /> : c.priceText}
                                    </span>
                                )}
                            </span>
                        </a>
                    </li>
                ))}
            </ul>
        </section>
    );
}
