/**
 * REQ-029 — manda un error del navegador a /api/client-error (queda en los logs del Worker,
 * Cloudflare Observability). Nunca lanza: reportar no puede romper la página.
 */
export function reportClientError(error: unknown, source: string, digest?: string): void {
  try {
    const e = error instanceof Error ? error : new Error(String(error));
    const body = JSON.stringify({
      message: e.message || "sin mensaje",
      stack: e.stack ?? "",
      path: window.location.pathname + window.location.search,
      source,
      digest: digest ?? "",
    });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/client-error", new Blob([body], { type: "application/json" }));
    else void fetch("/api/client-error", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
  } catch {
    /* nada: el reporte es best-effort */
  }
}
