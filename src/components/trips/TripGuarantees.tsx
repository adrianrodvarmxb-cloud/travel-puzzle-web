import type { TripCopy } from '@/trips/lib/copy';

/** Garantías Travel Puzzle (documento 2024). */
export function TripGuarantees({ c }: { c: TripCopy }) {
    const items = [['🗣️', c.g1], ['🧭', c.g2], ['🧩', c.g3], ['💳', c.g4]];
    return (
        <section className="rounded-2xl border border-white/10 bg-[#121D45] p-5">
            <h2 className="font-data text-[11px] uppercase tracking-[0.2em] text-[#008DFF]">{c.guarantees}</h2>
            <ul className="mt-3 grid grid-cols-2 gap-3 text-sm text-white">
                {items.map(([icon, label]) => <li key={label} className="flex items-center gap-2"><span aria-hidden>{icon}</span>{label}</li>)}
            </ul>
        </section>
    );
}
