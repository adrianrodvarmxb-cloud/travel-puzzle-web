import type { OptionCard } from '@/ficha/lib/practical-view';

/**
 * REQ-10830 · Bloque 12 «Opciones y precios» de la ficha única: una tarjeta por opción con su precio final y si lleva
 * traslado. Recibe solo las tarjetas ya armadas y su título (ISP); con una sola opción no llegan tarjetas y no pinta
 * nada. Los adicionales del proveedor se suman en la ola 12 (REQ-10636). Sin hooks (DIP).
 */
export function OpcionesBlock({ cards, heading }: { cards: OptionCard[]; heading: string }) {
    if (cards.length === 0) return null;
    return (
        <section data-bloque="opciones" className="mb-8">
            <h2 className="mb-3 font-display text-xl font-bold text-white">{heading}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
                {cards.map((c) => (
                    <li key={c.id} data-opcion={c.id} className="rounded-xl border border-white/15 p-4">
                        <h3 className="font-semibold text-white">{c.name}</h3>
                        {(c.transfer || c.startTime) && (
                            <p className="mt-1 text-sm text-white/70">{[c.transfer, c.startTime].filter(Boolean).join(' · ')}</p>
                        )}
                        {c.priceLabel && <p className="mt-2 font-data text-[#EAF54F]">{c.priceLabel}</p>}
                    </li>
                ))}
            </ul>
        </section>
    );
}
