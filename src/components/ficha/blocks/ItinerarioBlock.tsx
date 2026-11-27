import type { ItineraryDayView } from '@/ficha/lib/content-view';

/**
 * REQ-10819 · Bloque 9 «Itinerario» de la ficha única: un renglón por día, en orden. Recibe solo los días ya armados
 * y su título (ISP); sin días no pinta nada. Sin hooks (DIP).
 */
export function ItinerarioBlock({ days, heading }: { days: ItineraryDayView[]; heading: string }) {
    if (days.length === 0) return null;
    return (
        <section data-bloque="itinerario" className="mb-8">
            <h2 className="mb-3 font-display text-xl font-bold text-white">{heading}</h2>
            <ol className="space-y-4 border-l border-white/15 pl-4">
                {days.map((d) => (
                    <li key={d.day} data-dia={d.day}>
                        <p className="font-data text-[11px] uppercase tracking-[0.15em] text-[#EAF54F]">{d.label}</p>
                        {d.title && <h3 className="mt-1 font-semibold text-white">{d.title}</h3>}
                        <p className="mt-1 text-sm leading-relaxed text-[#E3E9F7]">{d.text}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
}
