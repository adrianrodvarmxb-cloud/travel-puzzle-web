import type { CompleteTripBlockView } from '@/ficha/lib/cross-sell-view';

/**
 * REQ-10846 · Bloque 19 «Completa tu viaje» de la ficha única: transporte por ubicación (ya elegido por el «cerca»
 * único) y, fuera de FREETOUR, la tarjeta de Kiwitaxi con la nota §L de afiliado. Recibe solo su vista (ISP); no lee
 * banderas ni base (DIP). Sin vista no pinta nada.
 */
export function CompletaTuViajeBlock({ view }: { view: CompleteTripBlockView | null }) {
    if (!view) return null;
    return (
        <section data-bloque="completa-tu-viaje" className="mb-8">
            <h2 className="mb-3 font-display text-xl font-bold text-white">{view.heading}</h2>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {view.transport.map((t) => (
                    <li key={t.id}>
                        <a href={t.href} data-transporte className="block rounded-xl border border-white/10 bg-white/5 p-4 text-white hover:border-white/30">{t.title}</a>
                    </li>
                ))}
                {view.affiliate && (
                    <li>
                        <a href={view.affiliate.url} target="_blank" rel="noopener noreferrer sponsored" data-afiliado className="block rounded-xl border border-white/10 bg-white/5 p-4 text-white hover:border-white/30">
                            <span className="block font-semibold">{view.affiliate.title}</span>
                            <span className="block text-sm text-white/70">{view.affiliate.by}</span>
                        </a>
                        <p data-nota-afiliado className="mt-2 text-xs text-white/60">{view.affiliate.note}</p>
                    </li>
                )}
            </ul>
        </section>
    );
}
