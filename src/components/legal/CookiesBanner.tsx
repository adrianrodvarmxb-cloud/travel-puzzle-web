'use client';

import { useEffect, useState } from 'react';
import { useOptionalLanguage } from '@/lib/language-context';
import { CLAVE_ENTENDIDO, bannerVisible, textoBanner } from '@/legal/lib/cookies';

/**
 * REQ-10788 (Dictamen del abogado, 19-11-2026, puntos 2 y 4): banner informativo de cookies (§B, es/en) con «Entendido» y
 * «Ver política». Solo con COOKIES_POLICY_ENABLED (`enabled` lo decide el servidor, DIP). Sin bitácora por visitante
 * (REQ-10786): el «Entendido» se recuerda en el almacenamiento local del navegador, no en una cookie ni en el servidor.
 * Se decide después de montar: el HTML del servidor no lo trae (INC-001). Recibe solo `enabled` (ISP).
 */
export function CookiesBanner({ enabled }: { enabled: boolean }) {
  const lang = useOptionalLanguage()?.language;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let entendido: string | null = null;
    try {
      entendido = localStorage.getItem(CLAVE_ENTENDIDO);
    } catch {
      /* sin almacenamiento: se muestra cada vez */
    }
    setVisible(bannerVisible({ encendido: enabled, entendido })); // REQ-10788
  }, [enabled]);

  if (!visible) return null;
  const t = textoBanner(lang);
  const cerrar = () => {
    try { localStorage.setItem(CLAVE_ENTENDIDO, new Date().toISOString().slice(0, 10)); } catch { /* nada */ }
    setVisible(false);
  };
  return (
    <div role="region" aria-label={t.verPolitica} lang={lang === 'en' ? 'en' : 'es'} className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-col gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-lg sm:flex-row sm:items-center">
      <span className="flex-1">{t.texto}</span>
      <span className="flex items-center gap-3">
        <a href="/cookies" className="font-semibold text-primary underline-offset-2 hover:underline">{t.verPolitica}</a>
        <button type="button" onClick={cerrar} className="rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:opacity-90">{t.entendido}</button>
      </span>
    </div>
  );
}
