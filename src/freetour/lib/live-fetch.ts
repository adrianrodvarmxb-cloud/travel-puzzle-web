/**
 * Llamada en vivo al proveedor con límite de tiempo (REQ-10666, INC-024).
 * Sin límite, una llamada que el proveedor no contesta deja abierta la petición de la ficha: el cliente espera sin
 * tope y la prueba de humo vence su espera de red aunque la página ya se haya pintado.
 * Solo para lecturas en vivo y el inicio de sesión; la reserva (POST) no pasa por aquí.
 */
export const LIVE_READ_TIMEOUT_MS = 10_000;

export interface LiveFetchOptions {
  /** Plazo en milisegundos; por omisión `LIVE_READ_TIMEOUT_MS`. */
  ms?: number;
  /** Inyectable para pruebas; por omisión el `fetch` global. */
  fetchImpl?: typeof fetch;
}

// REQ-10666
export async function liveFetch(url: string, init: RequestInit = {}, opts: LiveFetchOptions = {}): Promise<Response> {
  const ms = opts.ms ?? LIVE_READ_TIMEOUT_MS;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await (opts.fetchImpl ?? fetch)(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (!ctrl.signal.aborted) throw e;
    // El mensaje puede llegar al navegador: no nombra al proveedor.
    const err = new Error(`El proveedor no respondió en ${ms} ms`) as Error & { status: number };
    err.status = 504;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
