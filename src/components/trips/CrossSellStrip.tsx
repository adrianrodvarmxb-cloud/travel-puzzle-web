/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { CrossItem } from '@/trips/cross-sell';

/**
 * REQ-005, REQ-007: franja compacta de venta cruzada junto al botón de reserva.
 * Todo llega calculado del servidor (REQ-008: sin Intl en el navegador).
 */
export function CrossSellStrip({ eyebrow, question, from, freeLabel, items }: { eyebrow: string; question: string; from: string; freeLabel?: string; items: CrossItem[] }) {
    if (!items.length) return null;
    return (
        <div className="mt-4 space-y-2" data-testid="cross-sell-strip">
            <p className="font-data text-[10px] uppercase tracking-[0.16em] text-[#7CC4FF]">{eyebrow}</p>
            {items.map((it, i) => (
                <Link key={it.id} href={it.path} className="flex items-center gap-3 rounded-2xl border border-[#7CC4FF]/35 bg-[#0E1838] p-3 transition-colors hover:border-[#7CC4FF]/70">
                    {it.image ? <img src={it.image} alt="" loading="lazy" className="h-[52px] w-[52px] flex-none rounded-lg object-cover" /> : <span className="h-[52px] w-[52px] flex-none rounded-lg bg-[#1B2A5E]" />}
                    <span className="min-w-0 flex-1">
                        {i === 0 && <span className="block text-xs text-[#A9B6D6]">{question}</span>}
                        <span className="line-clamp-2 block text-sm font-semibold leading-snug text-white">{it.title}</span>
                        <span className="block text-xs text-[#A9B6D6]">{it.price ? <>{from} <b className="text-white">{it.price}</b></> : freeLabel}</span>
                    </span>
                    <span aria-hidden className="text-lg text-[#EAF54F]">→</span>
                </Link>
            ))}
        </div>
    );
}
