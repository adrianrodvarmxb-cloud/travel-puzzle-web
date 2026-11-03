'use client';
/** Versión 1 (sin uso desde la ola 1b; se conserva de forma reversible). */
import { MAX_MEETING_POINTS } from '@/trips/lib/trip';
import { Section, Input, smallBtn } from './fields';
import type { TripFormState, Patch } from './types';

/** Hasta 4 puntos de encuentro y la opción de recoger en hotel. */
export function MeetingSection({ v, patch }: { v: TripFormState; patch: Patch }) {
    const set = (i: number, p: Partial<{ name: string; address: string }>) => patch({ meetingPoints: v.meetingPoints.map((m, j) => (j === i ? { ...m, ...p } : m)) });
    return (
        <Section n={3} title="Puntos de encuentro">
            {v.meetingPoints.map((m, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
                    <Input placeholder="Nombre (ej. Aeropuerto de Pekín)" value={m.name} onChange={(e) => set(i, { name: e.target.value })} />
                    <Input placeholder="Dirección o indicaciones" value={m.address} onChange={(e) => set(i, { address: e.target.value })} />
                    <button type="button" className={smallBtn} onClick={() => patch({ meetingPoints: v.meetingPoints.filter((_, j) => j !== i) })}>Quitar</button>
                </div>
            ))}
            <button type="button" className={smallBtn} disabled={v.meetingPoints.length >= MAX_MEETING_POINTS} onClick={() => patch({ meetingPoints: [...v.meetingPoints, { name: '', address: '', lat: null, lng: null, instructions: '', photoKey: null }] })}>
                + Punto de encuentro ({v.meetingPoints.length}/{MAX_MEETING_POINTS})
            </button>
            <label className="flex items-center gap-2 text-sm text-white">
                <input type="checkbox" checked={v.hotelPickup} onChange={(e) => patch({ hotelPickup: e.target.checked })} />
                Opción "en mi hotel" (el cliente escribe el nombre de su hotel)
            </label>
        </Section>
    );
}
