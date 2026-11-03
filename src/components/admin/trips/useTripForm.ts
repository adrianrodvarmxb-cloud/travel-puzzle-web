'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TripFormState } from './types';

/** Estado del formulario y guardado (crear o editar). */
export function useTripForm(initial: TripFormState, id: string | null) {
    const router = useRouter();
    const [v, setV] = useState(initial);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const patch = (p: Partial<TripFormState>) => setV((cur) => ({ ...cur, ...p }));

    async function save() {
        setSaving(true);
        setMessage(null);
        const res = await fetch(id ? `/api/admin/viajes/${id}` : '/api/admin/viajes', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(v),
        });
        const json = await res.json().catch(() => ({}));
        setSaving(false);
        if (!res.ok) return setMessage({ ok: false, text: json.error ?? 'No se pudo guardar' });
        setMessage({ ok: true, text: 'Guardado' });
        if (!id) router.replace(`/admin/viajes/${json.id}`);
        else router.refresh();
    }

    return { v, patch, save, saving, message };
}
