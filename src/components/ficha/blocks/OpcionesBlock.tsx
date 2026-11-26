import type { OptionCard } from '@/ficha/lib/practical-view';
import type { AddonCard } from '@/ficha/lib/addons';
import { LocalPrice } from '../panel/LocalPrice';

/**
 * REQ-10830 · Bloque 12 «Opciones y precios» de la ficha única: una tarjeta por opción con su precio final y si lleva
 * traslado. Recibe solo las tarjetas ya armadas y su título (ISP); con una sola opción no llegan tarjetas y no pinta
 * nada. Sin hooks (DIP). REQ-10879: con `localUrl` el precio de la opción lo actualiza `LocalPrice` en el navegador
 * con la moneda del visitante, como el panel. REQ-10881 (ola 12, REQ-10636): los adicionales del proveedor llegan ya
 * filtrados (solo con precio final) y solo con `FICHA_ADDONS_ENABLED`; apagada llegan vacíos y el bloque es el de hoy.
 */
export function OpcionesBlock({ cards, heading, addons = [] }: { cards: OptionCard[]; heading: string; addons?: AddonCard[] }) {
    if (cards.length === 0 && addons.length === 0) return null;
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
                        {c.priceLabel && (
                            <p className="mt-2 font-data text-[#EAF54F]">
                                {c.localUrl ? <LocalPrice text={c.priceLabel} localUrl={c.localUrl} /> : c.priceLabel}
                            </p>
                        )}
                    </li>
                ))}
            </ul>
            {addons.length > 0 && (
                <ul data-adicionales className="mt-3 grid gap-3 sm:grid-cols-2">
                    {addons.map((a) => (
                        <li key={a.id} data-adicional={a.id} className="rounded-xl border border-dashed border-white/15 p-4">
                            <h3 className="font-semibold text-white">{a.name}</h3>
                            {(a.seasonLabel || a.note) && (
                                <p className="mt-1 text-sm text-white/70">{[a.seasonLabel, a.note].filter(Boolean).join(' · ')}</p>
                            )}
                            <p className="mt-2 font-data text-[#EAF54F]">
                                {a.localUrl ? <LocalPrice text={a.priceLabel} localUrl={a.localUrl} /> : a.priceLabel}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
