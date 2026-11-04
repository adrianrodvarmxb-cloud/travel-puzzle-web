/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { TripCopy } from '@/trips/lib/copy';
import type { TripCard } from '@/trips/public-load';

/** Tarjeta de viaje propio o de agencia (en /tours va marcada, gate L). */
export function OwnTripCard({ trip, c, lang, marked = false }: { trip: TripCard; c: TripCopy; lang: string; marked?: boolean }) {
    return (
        <Link href={trip.path} className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#EAF54F]/40 bg-[#121D45] text-white transition-transform duration-300 hover:-translate-y-1">
            <div className="relative aspect-[16/10] bg-[#1B2A5E]">
                {trip.image && <img src={trip.image} alt={trip.title} loading="lazy" className="h-full w-full object-cover" />}
                {marked && <span className="font-data absolute left-3 top-3 rounded-md bg-[#EAF54F] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#0A1330]">{c.recommended}</span>}
                <span className="font-data absolute bottom-3 left-3 rounded-md bg-[#0A1330]/75 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-[#7CC4FF]">{c.kinds[trip.kind]}</span>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-5">
                <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[#A9B6D6]">
                    {/* REQ-004: nombres de país calculados en el servidor (INC-001) */}{trip.places}{trip.durationDays ? ` · ${c.days(trip.durationDays)}` : ''}
                </p>
                <h3 className="font-display line-clamp-2 text-xl font-semibold leading-snug">{trip.title}</h3>
                {trip.summary && <p className="line-clamp-2 text-sm text-[#C9D6F5]">{trip.summary}</p>}
                {trip.price && (
                    <p className="mt-auto border-t border-white/10 pt-3 text-sm text-[#A9B6D6]">{c.from} <strong className="text-lg text-white">{trip.price.main}</strong>{trip.price.original ? <span className="text-xs"> · {trip.price.original}</span> : null}</p>
                )}
            </div>
        </Link>
    );
}
