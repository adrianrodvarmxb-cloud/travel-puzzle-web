'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { inputCls, primaryBtn, ghostBtn } from './styles';

/** REQ-1599: entrar sin contraseña (enlace al correo) o con Google. */
export function AccountSignIn() {
    const [busy, setBusy] = useState(false);
    const [sentTo, setSentTo] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const email = String(new FormData(e.currentTarget).get('email') ?? '').trim();
        const res = await fetch('/api/cuenta/enlace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }).catch(() => null);
        setBusy(false);
        if (!res?.ok) return setError('Escribe un correo válido.');
        setSentTo(email);
    }

    if (sentTo) {
        return (
            <div className="mt-8 space-y-4" role="status">
                <p className="text-base text-white">Revisa tu correo <strong>{sentTo}</strong>.</p>
                <p className="text-sm text-[#A9B6D6]">Te mandamos un enlace para entrar. Vence en 15 minutos y solo sirve una vez. Si no lo ves, busca en spam o promociones.</p>
                <button type="button" onClick={() => setSentTo(null)} className="text-sm text-[#9AAEE0] underline">Usar otro correo</button>
            </div>
        );
    }

    return (
        <div className="mt-8 space-y-6">
            <form onSubmit={onSubmit} className="space-y-3">
                <label htmlFor="cuenta-email" className="block text-sm text-[#A9B6D6]">Tu correo (el mismo con el que reservaste)</label>
                <input id="cuenta-email" name="email" type="email" required autoComplete="email" placeholder="tu@correo.com" className={inputCls} />
                <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Enviando…' : 'Mandarme el enlace para entrar'}</button>
                {error && <p className="text-sm text-[#FF8A73]">{error}</p>}
            </form>
            <div className="border-t border-white/10 pt-6">
                <button type="button" onClick={() => signIn('google', { callbackUrl: '/mi-cuenta/reservas' })} className={ghostBtn}>Entrar con Google</button>
            </div>
            <p className="text-xs text-[#7F8FBF]">Sin contraseñas. Al entrar aceptas el <a href="/privacidad" className="underline">aviso de privacidad</a>.</p>
        </div>
    );
}
