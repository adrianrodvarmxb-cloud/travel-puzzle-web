import type { ReactNode } from 'react';

/** Bloque con título de la ficha. */
export function TripSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="border-t border-white/10 pt-8">
            <h2 className="font-display text-2xl font-semibold text-white">{title}</h2>
            <div className="mt-4 text-[15px] leading-relaxed text-[#D5DCEE]">{children}</div>
        </section>
    );
}

export function TripList({ items, mark }: { items: string[]; mark: string }) {
    return (
        <ul className="space-y-2">
            {items.map((x, i) => <li key={i} className="flex gap-2"><span aria-hidden className="shrink-0">{mark}</span><span>{x}</span></li>)}
        </ul>
    );
}
