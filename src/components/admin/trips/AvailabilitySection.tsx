'use client';
import { useState } from 'react';
import { MAX_SLOTS } from '@/trips/schemas/trip';
import { Section, Field, Input, smallBtn } from './fields';
import { toNumber, type TripFormState, type Patch } from './types';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
type Av = TripFormState['availability'];

/** Días de la semana, hasta 8 horarios con cupo, fechas cerradas, temporadas y aviso mínimo (modelo Civitatis + Mega). */
export function AvailabilitySection({ v, patch }: { v: TripFormState; patch: Patch }) {
    const a = v.availability;
    const setAv = (p: Partial<Av>) => patch({ availability: { ...a, ...p } });
    const [closed, setClosed] = useState('');
    const setSlot = (i: number, p: Partial<Av['slots'][number]>) => setAv({ slots: a.slots.map((s, j) => (j === i ? { ...s, ...p } : s)) });
    const setSeason = (i: number, p: Partial<Av['seasons'][number]>) => setAv({ seasons: a.seasons.map((s, j) => (j === i ? { ...s, ...p } : s)) });
    return (
        <Section n={6} title="Disponibilidad">
            <Field label="Días que opera">
                <div className="flex flex-wrap gap-2">
                    {DAYS.map((d, i) => (
                        <button key={d} type="button" aria-pressed={a.weekdays.includes(i)} onClick={() => setAv({ weekdays: a.weekdays.includes(i) ? a.weekdays.filter((x) => x !== i) : [...a.weekdays, i].sort() })}
                            className={`w-12 rounded-full border py-1 text-xs font-semibold ${a.weekdays.includes(i) ? 'border-[#EAF54F] bg-[#EAF54F] text-[#0A1330]' : 'border-white/20 text-white'}`}>{d}</button>
                    ))}
                </div>
            </Field>
            <Field label={`Horarios (${a.slots.length}/${MAX_SLOTS})`} hint="Cupo vacío = sin límite.">
                <div className="space-y-2">
                    {a.slots.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <Input type="time" value={s.time} onChange={(e) => setSlot(i, { time: e.target.value })} style={{ width: 130 }} />
                            <Input type="number" min={1} placeholder="Cupo" value={s.capacity ?? ''} onChange={(e) => setSlot(i, { capacity: toNumber(e.target.value) })} style={{ width: 100 }} />
                            <button type="button" className={smallBtn} onClick={() => setAv({ slots: a.slots.filter((_, j) => j !== i) })}>×</button>
                        </div>
                    ))}
                    <button type="button" className={smallBtn} disabled={a.slots.length >= MAX_SLOTS} onClick={() => setAv({ slots: [...a.slots, { time: '09:00', capacity: null }] })}>+ Horario</button>
                </div>
            </Field>
            <Field label="Fechas cerradas">
                <div className="flex flex-wrap gap-2">
                    {a.closedDates.map((d) => (
                        <span key={d} className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white">{d} <button type="button" onClick={() => setAv({ closedDates: a.closedDates.filter((x) => x !== d) })}>×</button></span>
                    ))}
                </div>
                <div className="mt-2 flex gap-2">
                    <Input type="date" value={closed} onChange={(e) => setClosed(e.target.value)} />
                    <button type="button" className={smallBtn} disabled={!closed || a.closedDates.includes(closed)} onClick={() => { setAv({ closedDates: [...a.closedDates, closed].sort() }); setClosed(''); }}>Cerrar fecha</button>
                </div>
            </Field>
            <Field label="Temporadas con suplemento" hint="Se suma al precio adulto en esas fechas (puede ser negativo para promociones).">
                <div className="space-y-2">
                    {a.seasons.map((s, i) => (
                        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_110px_auto]">
                            <Input placeholder="Nombre (ej. Verano)" value={s.name} onChange={(e) => setSeason(i, { name: e.target.value })} />
                            <Input type="date" value={s.from} onChange={(e) => setSeason(i, { from: e.target.value })} />
                            <Input type="date" value={s.to} onChange={(e) => setSeason(i, { to: e.target.value })} />
                            <Input type="number" step="0.01" value={s.supplement} onChange={(e) => setSeason(i, { supplement: Number(e.target.value) })} />
                            <button type="button" className={smallBtn} onClick={() => setAv({ seasons: a.seasons.filter((_, j) => j !== i) })}>×</button>
                        </div>
                    ))}
                    <button type="button" className={smallBtn} onClick={() => setAv({ seasons: [...a.seasons, { name: '', from: '', to: '', supplement: 0 }] })}>+ Temporada</button>
                </div>
            </Field>
            <Field label="Aviso mínimo para reservar (horas)">
                <Input type="number" min={0} value={v.minNoticeHours} onChange={(e) => patch({ minNoticeHours: Number(e.target.value) || 0 })} style={{ width: 120 }} />
            </Field>
        </Section>
    );
}
