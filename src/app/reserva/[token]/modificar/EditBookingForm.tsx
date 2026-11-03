'use client';

import { useMemo, useState } from 'react';
import { Eyebrow, mono } from '@/components/booking/email-ui';

export interface EditOption {
    id: number;
    /** "2026-11-12 16:00" (hora local del tour). */
    date: string;
    language: string;
}

interface EditBookingFormProps {
    token: string;
    events: EditOption[];
    current: { eventId: number; adults: number; children: number };
}

const MESSAGES: Record<string, string> = {
    no_change: 'No hay cambios que guardar.',
    no_availability: 'Ya no hay lugares suficientes en ese horario. Elige otro.',
    min_adults: 'Este tour pide más adultos por reserva.',
    not_allowed: 'Esta reserva ya no se puede modificar en línea. Escríbenos por WhatsApp.',
    disabled: 'Por ahora los cambios se hacen por WhatsApp.',
};

const dayLabel = (d: string) =>
    new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

/** Elegir otro horario del mismo tour y las personas. Solo presenta y envía. */
export function EditBookingForm({ token, events, current }: EditBookingFormProps) {
    const [eventId, setEventId] = useState(current.eventId);
    const [adults, setAdults] = useState(current.adults);
    const [children, setChildren] = useState(current.children);
    const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
    const [message, setMessage] = useState<string | null>(null);

    const days = useMemo(() => {
        const map = new Map<string, EditOption[]>();
        for (const e of events) map.set(e.date.slice(0, 10), [...(map.get(e.date.slice(0, 10)) ?? []), e]);
        return [...map.entries()];
    }, [events]);

    const changed = eventId !== current.eventId || adults !== current.adults || children !== current.children;

    const submit = async () => {
        setState('sending');
        setMessage(null);
        const res = await fetch(`/api/reserva/${token}/modificar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId, adults, children }),
        }).catch(() => null);
        const data = res ? ((await res.json().catch(() => ({}))) as { result?: string }) : {};
        if (data.result === 'modified') {
            window.location.href = `/reserva/${token}?cambio=ok`;
            return;
        }
        setState('error');
        setMessage(MESSAGES[data.result ?? ''] ?? 'No pudimos guardar el cambio. Intenta de nuevo o escríbenos por WhatsApp.');
    };

    return (
        <div className="space-y-7">
            <section className="px-6 pt-7">
                <Eyebrow n={1}>Fecha y horario</Eyebrow>
                <h2 className="mb-3 text-[21px] font-bold tracking-tight text-[#0A1330]">Elige tu nuevo horario</h2>
                {days.length === 0 && <p className="text-sm text-gray-600">No hay otros horarios disponibles por ahora.</p>}
                <div className="space-y-4">
                    {days.map(([day, list]) => (
                        <div key={day}>
                            <p className={`${mono} mb-2 text-[10px] text-gray-500 first-letter:uppercase`}>{dayLabel(day)}</p>
                            <div className="flex flex-wrap gap-2">
                                {list.map((e) => (
                                    <button
                                        key={e.id}
                                        type="button"
                                        onClick={() => setEventId(e.id)}
                                        aria-pressed={eventId === e.id}
                                        className={`rounded-[10px] border px-4 py-2.5 text-[13px] font-semibold ${eventId === e.id ? 'border-[#008DFF] bg-[#008DFF] text-white' : 'border-[#E6EBF5] bg-white text-[#0A1330] hover:bg-[#F4F7FD]'}`}
                                    >
                                        {e.date.slice(11, 16)}{e.id === current.eventId ? ' · actual' : ''}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="px-6">
                <Eyebrow n={2}>Personas</Eyebrow>
                <h2 className="mb-3 text-[21px] font-bold tracking-tight text-[#0A1330]">¿Cuántos van?</h2>
                <Counter label="Adultos" value={adults} min={1} onChange={setAdults} />
                <Counter label="Niños" value={children} min={0} onChange={setChildren} />
            </section>

            <section className="px-6">
                {message && <p role="alert" className="mb-3 rounded-xl border border-[#C12909]/30 bg-[#C12909]/5 px-4 py-3 text-sm text-[#0A1330]">{message}</p>}
                <button type="button" onClick={submit} disabled={!changed || state === 'sending'} className="block w-full rounded-xl bg-[#C12909] px-5 py-4 text-center text-base font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                    {state === 'sending' ? 'Guardando…' : 'Guardar cambio  →'}
                </button>
                <p className="mt-3 text-center text-[13px] text-gray-500">Te mandaremos la confirmación del cambio a tu correo.</p>
            </section>
        </div>
    );
}

function Counter({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (v: number) => void }) {
    return (
        <div className="flex items-center justify-between border-b border-[#E6EBF5] py-3">
            <span className="font-semibold text-[#0A1330]">{label}</span>
            <div className="flex items-center gap-3">
                <button type="button" aria-label={`Menos ${label}`} onClick={() => onChange(Math.max(min, value - 1))} className="h-9 w-9 rounded-full border border-[#E6EBF5] text-lg font-bold text-[#0A1330] hover:bg-[#F4F7FD]">−</button>
                <span className="w-6 text-center font-mono text-lg font-bold text-[#0A1330]">{value}</span>
                <button type="button" aria-label={`Más ${label}`} onClick={() => onChange(Math.min(30, value + 1))} className="h-9 w-9 rounded-full border border-[#E6EBF5] text-lg font-bold text-[#0A1330] hover:bg-[#F4F7FD]">+</button>
            </div>
        </div>
    );
}
