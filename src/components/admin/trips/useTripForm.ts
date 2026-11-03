'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TripFormState } from './types';
import { TARGET_LANGS, LANG_LABEL_ES } from '@/trips/lib/translation';

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
        // Traducción automática (gate I): idioma por idioma, sin bloquear la captura.
        const tripId = id ?? json.id;
        let pending = 0;
        for (const lang of TARGET_LANGS) {
            setMessage({ ok: true, text: `Guardado · traduciendo al ${LANG_LABEL_ES[lang].toLowerCase()}…` });
            const r = await fetch(`/api/admin/viajes/${tripId}/traducir`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang }) }).catch(() => null);
            const j = r ? await r.json().catch(() => ({})) : {};
            pending += r?.ok ? 0 : (j.pending ?? 1);
        }
        setMessage({ ok: pending === 0, text: pending === 0 ? 'Guardado y traducido a 5 idiomas' : 'Guardado · algunas traducciones quedaron pendientes (revisa Traducciones)' });
        if (!id) router.replace(`/admin/viajes/${json.id}`);
        else router.refresh();
    }

    return { v, patch, save, saving, message };
}
