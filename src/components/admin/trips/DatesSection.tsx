'use client';
/** Versión 1 (sin uso desde la ola 1b; se conserva de forma reversible). */
import { useState } from 'react';
import { MAX_TIMES_PER_DAY } from '@/trips/lib/trip';
import { Section, Input, smallBtn } from './fields';
import type { TripFormState, Patch } from './types';

/** Fechas de salida, con hasta 4 horarios por día. */
export function DatesSection({ v, patch }: { v: TripFormState; patch: Patch }) {
    const [date, setDate] = useState('');
    const setTimes = (i: number, times: string[]) => patch({ dates: v.dates.map((d, j) => (j === i ? { ...d, times } : d)) });
    return (
        <Section n={2} title="Fechas y horarios">
            <div className="flex gap-2">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <button type="button" className={smallBtn} disabled={!date || v.dates.some((d) => d.date === date)} onClick={() => { patch({ dates: [...v.dates, { date, times: [] }].sort((a, b) => a.date.localeCompare(b.date)) }); setDate(''); }}>
                    Agregar fecha
                </button>
            </div>
            {v.dates.length === 0 && <p className="text-sm text-[#7F8DB0]">Sin fechas: se mostrará como "fechas a consultar".</p>}
            <ul className="space-y-3">
                {v.dates.map((d, i) => (
                    <li key={d.date} className="rounded-xl border border-white/10 p-3">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">{d.date}</span>
                            <button type="button" className={smallBtn} onClick={() => patch({ dates: v.dates.filter((_, j) => j !== i) })}>Quitar</button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {d.times.map((t, k) => (
                                <span key={t} className="flex items-center gap-1">
                                    <Input type="time" value={t} onChange={(e) => setTimes(i, d.times.map((x, m) => (m === k ? e.target.value : x)))} style={{ width: 120 }} />
                                    <button type="button" className={smallBtn} onClick={() => setTimes(i, d.times.filter((_, m) => m !== k))}>×</button>
                                </span>
                            ))}
                            <button type="button" className={smallBtn} disabled={d.times.length >= MAX_TIMES_PER_DAY} onClick={() => setTimes(i, [...d.times, '09:00'])}>
                                + Horario ({d.times.length}/{MAX_TIMES_PER_DAY})
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </Section>
    );
}
