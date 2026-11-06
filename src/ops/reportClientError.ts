import { clientErrorPayload } from '@/ops/lib/clientError';

/**
 * REQ-221 — manda un error del navegador a /api/client-error (queda en los logs del Worker).
 * Nunca lanza: reportar no puede romper la página.
 */
export function reportClientError(error: unknown, source: string, digest?: string): void {
  try {
    const body = clientErrorPayload(error, source, window.location.pathname + window.location.search, digest ?? '');
    if (typeof navigator.sendBeacon === 'function') navigator.sendBeacon('/api/client-error', new Blob([body], { type: 'application/json' }));
    else void fetch('/api/client-error', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {});
  } catch {
    /* nada: el reporte es best-effort */
  }
}
