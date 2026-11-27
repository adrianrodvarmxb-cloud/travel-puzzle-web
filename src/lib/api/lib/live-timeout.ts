/**
 * REQ-10664 (INC-024): tiempo máximo para las llamadas en vivo a FREETOUR que hace la ficha (salidas y detalle del
 * evento). Sin tope, una petición que FREETOUR no cierra deja la red de la página abierta: la ficha ya se pintó, pero
 * `networkidle` nunca llega y el humo la da por «sin respuesta» (así se regresó la publicación de #579). Al vencer, la
 * promesa falla con `status` 504 y la ficha se queda con lo del sync, igual que cuando la llamada falla.
 * Puro: recibe el `fetch` por parámetro.
 */

/** 10 s: holgado para FREETOUR en un día normal (0.3–1 s), corto frente a los 90 s del humo. */
export const LIVE_TIMEOUT_MS = 10_000;
/** Status con el que se reporta el tiempo vencido (Gateway Timeout); los reintentos del cliente lo excluyen. */
export const TIMEOUT_STATUS = 504;

export interface ErrorDeTiempo extends Error { status: number; timeout: true }

export function esErrorDeTiempo(e: unknown): e is ErrorDeTiempo {
  return typeof e === "object" && e !== null && (e as { timeout?: unknown }).timeout === true;
}

function esAbort(e: unknown): boolean {
  const n = (e as { name?: unknown } | null)?.name;
  return n === "AbortError" || n === "TimeoutError";
}

/** `fetch` con `AbortSignal.timeout(ms)`; un aborto por tiempo sale como ErrorDeTiempo (504), el resto de errores pasa igual. */
export async function fetchConLimite(input: RequestInfo | URL, init: RequestInit = {}, ms: number = LIVE_TIMEOUT_MS, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const signal = AbortSignal.timeout(ms);
  try {
    return await fetchImpl(input, { ...init, signal });
  } catch (e) {
    if (esAbort(e) || signal.aborted) {
      const err = new Error(`FreeTour no respondió en ${ms} ms (tiempo máximo, REQ-10664)`) as ErrorDeTiempo;
      err.status = TIMEOUT_STATUS;
      err.timeout = true;
      throw err;
    }
    throw e;
  }
}
