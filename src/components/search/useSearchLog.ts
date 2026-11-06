'use client';
/**
 * REQ-340/342: manda al servidor, sin datos personales, una búsqueda (con su número de resultados) y los clics en
 * resultados con su posición. Solo con SEARCH_LOG_ENABLED (la decide el servidor). sendBeacon: no frena la página.
 */
import { useEffect, useRef } from 'react';

const send = (body: Record<string, unknown>) => {
  try {
    const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/search/event', blob);
    else void fetch('/api/search/event', { method: 'POST', body: blob, keepalive: true }).catch(() => {});
  } catch { /* nunca rompe la página */ }
};

/** Una vez por búsqueda (texto + idioma), cuando ya se sabe cuántos resultados hay. */
export function useSearchLog(enabled: boolean, q: string | undefined, language: string, total: number | undefined, loading: boolean) {
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !q || loading || total === undefined) return;
    const key = `${language}:${q}`;
    if (last.current === key) return;
    last.current = key;
    send({ kind: 'search', q, language, results: total });
  }, [enabled, q, language, total, loading]);
  return (position: number) => { if (enabled && q) send({ kind: 'click', q, language, position }); };
}
