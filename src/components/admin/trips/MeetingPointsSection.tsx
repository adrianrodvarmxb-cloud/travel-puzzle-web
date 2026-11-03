'use client';
/* eslint-disable @next/next/no-img-element */
import { MAX_POINTS } from '@/trips/schemas/trip';
import { parseMapsLink, mapsUrl } from '@/trips/lib/maps';
import { imageUrl } from '@/trips/lib/image';
import { Section, Field, Input, TextArea, smallBtn } from './fields';
import type { TripFormState, Patch } from './types';

type Point = TripFormState['meetingPoints'][number];
const emptyPoint: Point = { name: '', address: '', lat: null, lng: null, instructions: '', photoKey: null };

async function uploadOne(file: File): Promise<string | null> {
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/admin/fotos', { method: 'POST', body });
    const json = await res.json().catch(() => ({}));
    return res.ok ? json.key : null;
}

/** Hasta 8 puntos: nombre, dirección, pin (pegando el enlace de Google Maps), indicaciones y foto. */
export function MeetingPointsSection({ v, patch }: { v: TripFormState; patch: Patch }) {
    const set = (i: number, p: Partial<Point>) => patch({ meetingPoints: v.meetingPoints.map((m, j) => (j === i ? { ...m, ...p } : m)) });
    return (
        <Section n={4} title="Puntos de encuentro">
            {v.meetingPoints.map((m, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-white/10 p-3">
                    <div className="flex items-center justify-between">
                        <span className="font-data text-[11px] uppercase tracking-wider text-[#9AAEE0]">Punto {i + 1}</span>
                        <button type="button" className={smallBtn} onClick={() => patch({ meetingPoints: v.meetingPoints.filter((_, j) => j !== i) })}>Quitar</button>
                    </div>
                    <Input placeholder="Nombre (ej. Zócalo, frente a la catedral)" value={m.name} onChange={(e) => set(i, { name: e.target.value })} />
                    <Input placeholder="Dirección" value={m.address} onChange={(e) => set(i, { address: e.target.value })} />
                    <Field label="Ubicación en el mapa" hint="Pega el enlace de Google Maps del lugar (o 'latitud, longitud').">
                        <Input placeholder="https://www.google.com/maps/…" onBlur={(e) => { const c = parseMapsLink(e.target.value); if (c) set(i, c); }} />
                    </Field>
                    {m.lat !== null && m.lng !== null ? (
                        <a href={mapsUrl(m.lat, m.lng)} target="_blank" rel="noopener" className="block text-xs text-[#7CE3A1] underline">📍 {m.lat}, {m.lng} — ver en el mapa</a>
                    ) : (
                        <span className="block text-xs text-[#FF8A73]">Sin ubicación todavía</span>
                    )}
                    <TextArea rows={2} placeholder="Cómo reconocer al guía / indicaciones" value={m.instructions} onChange={(e) => set(i, { instructions: e.target.value })} />
                    <div className="flex items-center gap-3">
                        {m.photoKey && <img src={imageUrl(m.photoKey)} alt="" className="h-14 w-20 rounded object-cover" />}
                        <label className={`${smallBtn} cursor-pointer`}>
                            {m.photoKey ? 'Cambiar foto del punto' : 'Foto del punto'}
                            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const k = await uploadOne(f); if (k) set(i, { photoKey: k }); } e.target.value = ''; }} />
                        </label>
                    </div>
                </div>
            ))}
            <button type="button" className={smallBtn} disabled={v.meetingPoints.length >= MAX_POINTS} onClick={() => patch({ meetingPoints: [...v.meetingPoints, { ...emptyPoint }] })}>
                + Punto de encuentro ({v.meetingPoints.length}/{MAX_POINTS})
            </button>
            <label className="flex items-center gap-2 text-sm text-white">
                <input type="checkbox" checked={v.hotelPickup} onChange={(e) => patch({ hotelPickup: e.target.checked })} />
                Opción "en mi hotel" (el cliente escribe el nombre de su hotel)
            </label>
            <Field label="Punto de término" hint="Dónde termina, si es distinto."><Input value={v.endPoint} onChange={(e) => patch({ endPoint: e.target.value })} /></Field>
        </Section>
    );
}
