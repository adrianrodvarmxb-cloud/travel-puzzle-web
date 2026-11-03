'use client';
import { useState } from 'react';
import { PasswordInput } from './PasswordInput';

/** Formulario de contraseña nueva (dos veces). */
export function SetPasswordForm({ email, exp, sig }: { email: string; exp: number; sig: string }) {
    const [state, setState] = useState<{ busy: boolean; error: string | null; done: boolean }>({ busy: false, error: null, done: false });

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setState({ busy: true, error: null, done: false });
        const res = await fetch('/api/admin/contrasena', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, exp, sig, password: f.get('password'), confirm: f.get('confirm') }),
        });
        const json = await res.json().catch(() => ({}));
        setState({ busy: false, error: res.ok ? null : json.error ?? 'No se pudo guardar', done: res.ok });
    }

    if (state.done) {
        return (
            <div className="mt-6 space-y-4">
                <p className="text-sm text-[#7CE3A1]">Listo, tu contraseña quedó guardada.</p>
                <a href="/admin/entrar" className="block w-full rounded-full bg-[#008DFF] px-5 py-3 text-center text-sm font-bold text-white">Entrar al gestor</a>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <p className="text-sm text-[#A9B6D6]">{email}</p>
            <PasswordInput name="password" required minLength={10} autoComplete="new-password" placeholder="Contraseña nueva (mínimo 10 caracteres)" />
            <PasswordInput name="confirm" required minLength={10} autoComplete="new-password" placeholder="Repítela" />
            <button type="submit" disabled={state.busy} className="w-full rounded-full bg-[#008DFF] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{state.busy ? 'Guardando…' : 'Guardar contraseña'}</button>
            {state.error && <p className="text-sm text-[#FF8A73]">{state.error}</p>}
        </form>
    );
}
