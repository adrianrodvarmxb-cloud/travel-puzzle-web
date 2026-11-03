'use client';

import { useState } from 'react';

type Action = 'publish' | 'hide';
const DONE: Record<string, string> = { published: 'Publicada ✓', hidden: 'Oculta ✓', no_consent: 'El cliente no aceptó publicarla', invalid: 'Enlace vencido o no válido', not_found: 'No existe' };

/** Botones Publicar / Ocultar; mandan la firma que llegó en el enlace (correo o panel). */
export function ModerateButtons({ id, exp, sig, actions, canPublish }: { id: string; exp: number; sig: string; actions: Action[]; canPublish: boolean }) {
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: Action) => {
    setBusy(true);
    const res = await fetch('/api/reviews/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, exp, sig }),
    }).catch(() => null);
    const data = res ? ((await res.json().catch(() => ({}))) as { result?: string }) : {};
    setResult(data.result ?? 'invalid');
    setBusy(false);
  };

  if (result) return <p className="font-semibold text-[#EAF54F]">{DONE[result] ?? result}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {actions.includes('publish') && canPublish && (
        <button type="button" disabled={busy} onClick={() => run('publish')} className="rounded-xl bg-[#C12909] px-5 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50">Publicar</button>
      )}
      {actions.includes('hide') && (
        <button type="button" disabled={busy} onClick={() => run('hide')} className="rounded-xl border border-white/25 px-5 py-2.5 font-semibold text-white hover:border-white/60 disabled:opacity-50">Ocultar</button>
      )}
    </div>
  );
}
