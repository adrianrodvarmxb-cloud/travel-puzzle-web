'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { inputCls } from './trips/fields';

/** Entrada del equipo: correo y contraseña (principal), pedir enlace de contraseña y Google. */
export function AdminSignIn({ callbackUrl }: { callbackUrl: string }) {
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [linkMode, setLinkMode] = useState(false);
    const [linkSent, setLinkSent] = useState(false);

    async function onSignIn(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const f = new FormData(e.currentTarget);
        const email = String(f.get('email') ?? '').trim().toLowerCase();
        const res = await signIn('credentials', { email, password: f.get('password'), redirect: false });
        setBusy(false);
        if (res?.error) return setError('Correo o contraseña incorrectos.');
        window.location.href = callbackUrl;
    }

    async function onRequestLink(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const email = String(new FormData(e.currentTarget).get('email') ?? '');
        const res = await fetch('/api/admin/contrasena/enlace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        setBusy(false);
        if (!res.ok) return setError('Escribe un correo válido.');
        setLinkSent(true);
    }

    if (linkMode) {
        return (
            <div className="mt-8 space-y-4">
                {linkSent ? (
                    <p className="text-sm text-[#7CE3A1]">Si tu correo tiene acceso al gestor, te llegó un enlace para crear tu contraseña. Vence en 1 hora.</p>
                ) : (
                    <form onSubmit={onRequestLink} className="space-y-3">
                        <p className="text-sm text-[#A9B6D6]">Te mandamos un enlace a tu correo para crear o cambiar tu contraseña.</p>
                        <input name="email" type="email" required placeholder="Correo" className={inputCls} />
                        <button type="submit" disabled={busy} className="w-full rounded-full bg-[#008DFF] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Enviando…' : 'Mandarme el enlace'}</button>
                        {error && <p className="text-sm text-[#FF8A73]">{error}</p>}
                    </form>
                )}
                <button type="button" onClick={() => { setLinkMode(false); setLinkSent(false); setError(null); }} className="text-sm text-[#9AAEE0] underline">Regresar</button>
            </div>
        );
    }

    return (
        <div className="mt-8 space-y-6">
            <form onSubmit={onSignIn} className="space-y-3">
                <input name="email" type="email" required autoComplete="username" placeholder="Correo" className={inputCls} />
                <input name="password" type="password" required autoComplete="current-password" placeholder="Contraseña" className={inputCls} />
                <button type="submit" disabled={busy} className="w-full rounded-full bg-[#008DFF] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Entrando…' : 'Entrar'}</button>
                {error && <p className="text-sm text-[#FF8A73]">{error}</p>}
            </form>
            <button type="button" onClick={() => setLinkMode(true)} className="text-sm text-[#9AAEE0] underline">Crear o cambiar mi contraseña</button>
            <div className="border-t border-white/10 pt-6">
                <button type="button" onClick={() => signIn('google', { callbackUrl })} className="w-full rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white">
                    Entrar con Google
                </button>
            </div>
        </div>
    );
}
