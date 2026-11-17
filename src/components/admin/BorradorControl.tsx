'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** REQ-10693: el PO edita asunto, texto u hora, cancela o manda ya un borrador programado. */
export function BorradorControl({ id, asunto, texto, enviarEn }: { id: string; asunto: string; texto: string; enviarEn: string }) {
    const router = useRouter();
    const [a, setA] = useState(asunto);
    const [t, setT] = useState(texto);
    const [h, setH] = useState(enviarEn.slice(0, 16));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function mandar(body: Record<string, unknown>) {
        setBusy(true); setError('');
        const res = await fetch(`/api/admin/borradores/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const r = (await res.json().catch(() => ({}))) as { motivo?: string; error?: string };
        if (!res.ok) setError(r.motivo ?? r.error ?? 'No se pudo');
        setBusy(false);
        router.refresh();
    }
    return (
        <div className="mt-3 space-y-2">
            <input value={a} onChange={(e) => setA(e.target.value)} className="w-full rounded-xl border border-white/20 bg-[#0A1330] px-3 py-2 text-sm text-white" aria-label="Asunto" />
            <textarea value={t} onChange={(e) => setT(e.target.value)} rows={8} className="w-full rounded-xl border border-white/20 bg-[#0A1330] px-3 py-2 font-mono text-xs text-white" aria-label="Texto" />
            <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-[#9AAEE0]">Sale (UTC) <input type="datetime-local" value={h} onChange={(e) => setH(e.target.value)} className="ml-1 rounded-full border border-white/20 bg-[#0A1330] px-3 py-1 text-xs text-white" /></label>
                <button type="button" disabled={busy} onClick={() => mandar({ accion: 'editar', asunto: a, texto: t, enviarEn: new Date(`${h}:00Z`).toISOString() })} className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white">Guardar cambios</button>
                <button type="button" disabled={busy} onClick={() => mandar({ accion: 'enviar_ahora' })} className="rounded-full border border-[#EAF54F] bg-[#EAF54F] px-4 py-1.5 text-xs font-semibold text-[#0A1330]">Enviar ya</button>
                <button type="button" disabled={busy} onClick={() => { if (confirm('¿Cancelar este borrador? No se enviará.')) void mandar({ accion: 'cancelar', motivo: 'cancelado por el PO en el panel' }); }} className="rounded-full border border-[#FF8A8A]/60 px-4 py-1.5 text-xs font-semibold text-[#FF8A8A]">Cancelar</button>
                {error && <span className="text-xs text-[#FF8A8A]">{error}</span>}
            </div>
        </div>
    );
}
