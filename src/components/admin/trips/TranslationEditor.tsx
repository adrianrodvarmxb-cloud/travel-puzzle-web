'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fingerprint, keyLabel, type Entry, type TargetLang } from '@/trips/lib/translation';
import { TextArea, smallBtn } from './fields';

/** Lista español → traducción, editable; guardar pone candado; "Volver a automática" lo quita. */
export function TranslationEditor({ id, lang, source, entries }: { id: string; lang: TargetLang; source: Record<string, string>; entries: Record<string, Entry> }) {
    const router = useRouter();
    const [busy, setBusy] = useState<string | null>(null);
    const [msg, setMsg] = useState<string | null>(null);

    async function translateNow(force = false) {
        setBusy(force ? '__force' : '__all');
        const res = await fetch(`/api/admin/viajes/${id}/traducir`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang, force }) });
        const j = await res.json().catch(() => ({}));
        setMsg(res.ok ? `Traducidos: ${j.translated}` : `No se pudo traducir todo (${j.pending ?? '?'} pendientes)`);
        setBusy(null);
        router.refresh();
    }
    async function save(key: string, text: string) {
        setBusy(key);
        await fetch(`/api/admin/viajes/${id}/traducciones`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang, key, text }) });
        setBusy(null);
        router.refresh();
    }

    return (
        <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <button type="button" className={smallBtn} disabled={busy !== null} onClick={() => translateNow()}>{busy === '__all' ? 'Traduciendo…' : 'Traducir pendientes ahora'}</button>
                <button type="button" className={smallBtn} disabled={busy !== null} onClick={() => translateNow(true)}>{busy === '__force' ? 'Traduciendo…' : 'Volver a traducir todo (menos 🔒)'}</button>
                {msg && <span className="text-sm text-[#D5DCEE]">{msg}</span>}
            </div>
            {Object.entries(source).map(([key, es]) => {
                const e = entries[key];
                const outdated = e && e.src !== fingerprint(es);
                return (
                    <form key={`${key}-${e?.text ?? ''}`} className="rounded-xl border border-white/10 bg-white/5 p-3" onSubmit={(ev) => { ev.preventDefault(); save(key, String(new FormData(ev.currentTarget).get('t') ?? '')); }}>
                        <div className="font-data flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-[#9AAEE0]">
                            {keyLabel(key)}
                            {e?.manual && <span className="text-[#EAF54F]">🔒 editada a mano</span>}
                            {!e && <span className="text-[#FF8A73]">sin traducir</span>}
                            {outdated && <span className="text-[#FF8A73]">el español cambió</span>}
                        </div>
                        <p className="mt-1 whitespace-pre-line text-sm text-[#A9B6D6]">{es}</p>
                        <div className="mt-2"><TextArea name="t" rows={Math.min(8, Math.max(2, Math.ceil(es.length / 90)))} defaultValue={e?.text ?? ''} /></div>
                        <div className="mt-2 flex gap-2">
                            <button type="submit" className={smallBtn} disabled={busy !== null}>Guardar 🔒</button>
                            {e?.manual && <button type="button" className={smallBtn} disabled={busy !== null} onClick={() => save(key, '')}>Volver a automática</button>}
                        </div>
                    </form>
                );
            })}
        </div>
    );
}
