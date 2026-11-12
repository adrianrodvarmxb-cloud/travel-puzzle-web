'use client';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { inputCls, primaryBtn, ghostBtn } from './styles';

/** REQ-1594: nombre, cerrar sesión y borrar la cuenta (con confirmación en la página, sin diálogos del navegador). */
export function AccountSettings({ name, email }: { name: string | null; email: string }) {
    const [value, setValue] = useState(name ?? '');
    const [msg, setMsg] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        const res = await fetch('/api/cuenta', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: value }) }).catch(() => null);
        setBusy(false);
        setMsg(res?.ok ? 'Guardado.' : 'Escribe un nombre de 1 a 80 caracteres.');
    }

    async function remove() {
        setBusy(true);
        const res = await fetch('/api/cuenta', { method: 'DELETE' }).catch(() => null);
        if (!res?.ok) { setBusy(false); return setMsg('No pudimos borrar la cuenta. Escríbenos a info@travelpuzzle.com.mx.'); }
        await signOut({ callbackUrl: '/' });
    }

    return (
        <div className="mt-8 space-y-8">
            <form onSubmit={save} className="space-y-3">
                <p className="text-sm text-[#A9B6D6]">Correo: <strong className="text-white">{email}</strong></p>
                <label htmlFor="cuenta-nombre" className="block text-sm text-[#A9B6D6]">Nombre</label>
                <input id="cuenta-nombre" value={value} onChange={(e) => setValue(e.target.value)} maxLength={80} required autoComplete="name" className={inputCls} />
                <button type="submit" disabled={busy} className={primaryBtn}>Guardar</button>
                {msg && <p className="text-sm text-[#D5DCEE]" role="status">{msg}</p>}
            </form>
            <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className={ghostBtn}>Cerrar sesión</button>
            <div className="border-t border-white/10 pt-6">
                {confirmDelete ? (
                    <div className="space-y-3">
                        <p className="text-sm text-[#D5DCEE]">¿Borrar tu cuenta? Tus reservas siguen activas y las puedes gestionar desde los correos que te enviamos.</p>
                        <button type="button" onClick={remove} disabled={busy} className="w-full rounded-full bg-[#E5352B] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Sí, borrar mi cuenta</button>
                        <button type="button" onClick={() => setConfirmDelete(false)} className="text-sm text-[#9AAEE0] underline">Cancelar</button>
                    </div>
                ) : (
                    <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm text-[#FF8A73] underline">Borrar mi cuenta</button>
                )}
            </div>
        </div>
    );
}
