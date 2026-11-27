/**
 * REQ-10817 · Bloque 7 «Lo más destacado» de la ficha única. Recibe solo la lista ya limpia y su título (ISP); sin
 * puntos no pinta nada. Sin hooks: sirve en servidor (DIP).
 */
export function DestacadoBlock({ items, heading }: { items: string[]; heading: string }) {
    if (items.length === 0) return null;
    return (
        <section data-bloque="destacado" className="mb-8">
            <h2 className="mb-3 font-display text-xl font-bold text-white">{heading}</h2>
            <ul className="space-y-2">
                {items.map((s) => (
                    <li key={s} className="flex gap-2 text-[#E3E9F7]"><span aria-hidden className="text-[#EAF54F]">✓</span><span>{s}</span></li>
                ))}
            </ul>
        </section>
    );
}
