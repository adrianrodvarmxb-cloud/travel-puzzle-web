'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { primaryBtn } from './styles';

/**
 * REQ-1591: el enlace no entra solo al abrirse (los filtros de correo abren enlaces y lo gastarían);
 * el cliente confirma con un botón.
 */
export function VerifyLogin({ email, exp, sig }: { email: string; exp: string; sig: string }) {
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);

    async function enter() {
        setBusy(true);
        const res = await signIn('enlace', { email, exp, sig, redirect: false });
        if (res?.error || !res?.ok) {
            setBusy(false);
            return setFailed(true);
        }
        window.location.href = '/mi-cuenta/reservas';
    }

    if (failed) {
        return (
            <div className="mt-8 space-y-4" role="alert">
                <p className="text-sm text-[#D5DCEE]">El enlace venció o ya se usó. Pide uno nuevo: llega en segundos.</p>
                <a href="/mi-cuenta/entrar" className={`${primaryBtn} block text-center`}>Pedir otro enlace</a>
            </div>
        );
    }
    return (
        <div className="mt-8 space-y-3">
            <p className="text-sm text-[#A9B6D6]">Vas a entrar como <strong className="text-white">{email}</strong>.</p>
            <button type="button" onClick={enter} disabled={busy} className={primaryBtn}>{busy ? 'Entrando…' : 'Entrar a mi cuenta'}</button>
        </div>
    );
}
