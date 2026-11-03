'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STATUS_LABEL, type TripStatus } from '@/trips/lib/trip';
import { smallBtn } from './fields';

const ACTIONS: { to: TripStatus; label: string }[] = [
    { to: 'published', label: 'Publicar' },
    { to: 'hidden', label: 'Ocultar' },
    { to: 'draft', label: 'Regresar a borrador' },
];

/** Cambia el estado del viaje (nunca se borra). */
export function StatusButtons({ id, status }: { id: string; status: string }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    async function go(to: TripStatus) {
        setError(null);
        const res = await fetch(`/api/admin/viajes/${id}/estado`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: to }) });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return setError(json.error ?? 'No se pudo cambiar');
        router.refresh();
    }
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="font-data rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wider text-[#D5DCEE]">{STATUS_LABEL[status as TripStatus] ?? status}</span>
            {ACTIONS.filter((a) => a.to !== status).map((a) => (
                <button key={a.to} type="button" className={smallBtn} onClick={() => go(a.to)}>{a.label}</button>
            ))}
            {error && <span className="w-full text-xs text-[#FF8A73]">{error}</span>}
        </div>
    );
}
