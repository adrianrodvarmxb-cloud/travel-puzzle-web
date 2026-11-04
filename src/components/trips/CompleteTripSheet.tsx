'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import type { CrossItem } from '@/trips/cross-sell';
import type { CrossSellCopy } from '@/trips/lib/cross-sell-copy';

/**
 * REQ-006: ventana "Completa tu viaje" al tocar "Apartar con un asesor".
 * Abajo en celular, centrada en escritorio. Devuelve los títulos elegidos (o ninguno).
 */
export function CompleteTripSheet({ city, items, copy, onDone }: { city: string; items: CrossItem[]; copy: CrossSellCopy; onDone: (chosenTitles: string[]) => void }) {
    const [chosen, setChosen] = useState<string[]>(() => items.map((i) => i.id));
    const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
    return (
        <div role="dialog" aria-modal="true" aria-label={copy.sheetTitle(city)} className="fixed inset-0 z-[60] flex items-end justify-center bg-[#050A1E]/75 p-0 md:items-center md:p-4" onClick={() => onDone([])}>
            <div className="w-full max-w-lg rounded-t-3xl border border-[#EAF54F]/40 bg-[#121D45] p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl md:rounded-3xl md:pb-5" onClick={(e) => e.stopPropagation()}>
                <div className="mx-auto mb-4 h-1 w-11 rounded bg-[#2B3B75] md:hidden" />
                <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[#EAF54F]">{copy.sheetEyebrow}</p>
                <h3 className="font-display mt-2 text-xl font-bold text-white">{copy.sheetTitle(city)}</h3>
                <p className="mt-1 text-sm text-[#C9D6F5]">{copy.sheetSub}</p>
                <div className="mt-4 space-y-2">
                    {items.map((it) => (
                        <label key={it.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#7CC4FF]/35 bg-[#0E1838] p-3">
                            {it.image ? <img src={it.image} alt="" className="h-16 w-16 flex-none rounded-lg object-cover" /> : <span className="h-16 w-16 flex-none rounded-lg bg-[#1B2A5E]" />}
                            <span className="min-w-0 flex-1">
                                <span className="line-clamp-2 block text-sm font-semibold text-white">{it.title}</span>
                                {it.price && <span className="text-xs text-[#A9B6D6]">{copy.from} <b className="text-white">{it.price}</b></span>}
                            </span>
                            <input type="checkbox" className="h-5 w-5 accent-[#EAF54F]" checked={chosen.includes(it.id)} onChange={() => toggle(it.id)} />
                        </label>
                    ))}
                </div>
                <button type="button" className="mt-4 w-full rounded-xl bg-[#C12909] px-5 py-3.5 font-semibold text-white hover:bg-[#A32207]" onClick={() => onDone(items.filter((i) => chosen.includes(i.id)).map((i) => i.title))}>
                    {copy.continueWith} →
                </button>
                <button type="button" className="mt-2 w-full py-2 text-sm text-[#A9B6D6] underline" onClick={() => onDone([])}>
                    {copy.noThanks}
                </button>
            </div>
        </div>
    );
}
