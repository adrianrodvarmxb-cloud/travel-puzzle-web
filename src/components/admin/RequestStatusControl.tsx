'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { REQUEST_STATUSES, REQUEST_STATUS_LABEL } from '@/trips/lib/request';
import { inputCls } from './trips/fields';

/** Estado y notas internas de una solicitud. */
export function RequestStatusControl({ id, status, notes }: { id: string; status: string; notes: string }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [open, setOpen] = useState(false);
    async function save(data: { status?: string; notes?: string }) {
        setBusy(true);
        await fetch(`/api/admin/solicitudes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        setBusy(false);
        router.refresh();
    }
    return (
        <div className="flex flex-wrap items-center gap-2">
            <select value={status} disabled={busy} onChange={(e) => save({ status: e.target.value })} className="rounded-full border border-white/20 bg-[#0A1330] px-3 py-1 text-xs font-semibold text-white">
                {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{REQUEST_STATUS_LABEL[s]}</option>)}
            </select>
            <button type="button" onClick={() => setOpen(!open)} className="text-xs text-[#9AAEE0] underline">Notas{notes ? ' ✎' : ''}</button>
            {open && (
                <form className="w-full" onSubmit={(e) => { e.preventDefault(); save({ notes: String(new FormData(e.currentTarget).get('n') ?? '') }); }}>
                    <textarea name="n" rows={2} defaultValue={notes} className={inputCls} />
                    <button type="submit" disabled={busy} className="mt-1 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white">Guardar notas</button>
                </form>
            )}
        </div>
    );
}
