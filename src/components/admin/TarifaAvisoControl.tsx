'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** REQ-1580: botones Confirmar y Descartar de un cambio de tarifa; si falta, elegir el producto del anexo. */
export function TarifaAvisoControl({ id, puedeConfirmar, renglones }: { id: string; puedeConfirmar: boolean; renglones?: { id: string; producto: string }[] }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [tarifaId, setTarifaId] = useState('');
    async function enviar(accion: 'confirmar' | 'descartar') {
        setBusy(true); setError('');
        const res = await fetch(`/api/admin/tarifas/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion, ...(tarifaId && { tarifaId }) }) });
        const r = (await res.json().catch(() => ({}))) as { motivo?: string; error?: string };
        if (!res.ok) setError(r.motivo ?? r.error ?? 'No se pudo');
        setBusy(false);
        router.refresh();
    }
    return (
        <div className="mt-3 flex flex-wrap items-center gap-2">
            {renglones && (
                <select value={tarifaId} onChange={(e) => setTarifaId(e.target.value)} className="rounded-full border border-white/20 bg-[#0A1330] px-3 py-1 text-xs text-white">
                    <option value="">Elige el producto del anexo</option>
                    {renglones.map((r) => <option key={r.id} value={r.id}>{r.producto}</option>)}
                </select>
            )}
            {puedeConfirmar && (
                <button type="button" disabled={busy || (!!renglones && !tarifaId)} onClick={() => enviar('confirmar')} className="rounded-full border border-[#EAF54F] bg-[#EAF54F] px-4 py-1.5 text-xs font-semibold text-[#0A1330] disabled:opacity-50">Confirmar</button>
            )}
            <button type="button" disabled={busy} onClick={() => enviar('descartar')} className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white">Descartar</button>
            {error && <span className="text-xs text-[#FF8A8A]">{error}</span>}
        </div>
    );
}
