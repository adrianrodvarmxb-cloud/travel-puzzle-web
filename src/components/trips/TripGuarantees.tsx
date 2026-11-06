import type { TripCopy } from '@/trips/lib/copy';
import type { Guarantee } from '@/trips/lib/guarantees';

/** Garantías Travel Puzzle (documento 2024). Qué sale lo decide guaranteeItems (REQ-154/156/157); vacío = no se pinta. */
export function TripGuarantees({ c, items }: { c: TripCopy; items: Guarantee[] }) {
    if (!items.length) return null;
    return (
        <section className="rounded-2xl border border-white/10 bg-[#121D45] p-5">
            <h2 className="font-data text-[11px] uppercase tracking-[0.2em] text-[#008DFF]">{c.guarantees}</h2>
            <ul className="mt-3 grid grid-cols-2 gap-3 text-sm text-white">
                {items.map((g) => <li key={g.key} className="flex items-center gap-2"><span aria-hidden>{g.icon}</span>{g.label}</li>)}
            </ul>
        </section>
    );
}
