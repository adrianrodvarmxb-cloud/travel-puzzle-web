'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { inputCls } from './trips/fields';

/** Botón de Google y formulario de correo para el equipo. */
export function AdminSignIn({ callbackUrl }: { callbackUrl: string }) {
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const f = new FormData(e.currentTarget);
        const res = await signIn('credentials', { email: f.get('email'), password: f.get('password'), redirect: false });
        setBusy(false);
        if (res?.error) return setError('Correo o contraseña incorrectos.');
        window.location.href = callbackUrl;
    }

    return (
        <div className="mt-8 space-y-6">
            <button type="button" onClick={() => signIn('google', { callbackUrl })} className="w-full rounded-full bg-white px-5 py-3 text-sm font-bold text-[#0A1330]">
                Entrar con Google
            </button>
            <form onSubmit={onSubmit} className="space-y-3">
                <input name="email" type="email" required placeholder="Correo" className={inputCls} />
                <input name="password" type="password" required placeholder="Contraseña" className={inputCls} />
                <button type="submit" disabled={busy} className="w-full rounded-full bg-[#008DFF] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Entrando…' : 'Entrar'}</button>
                {error && <p className="text-sm text-[#FF8A73]">{error}</p>}
            </form>
        </div>
    );
}
