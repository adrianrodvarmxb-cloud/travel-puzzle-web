/**
 * Reintentos del sync blindado y de consultas a FREETOUR (REQ-077). Pura.
 * - 429: se espera lo que diga Retry-After (mínimo 1 minuto, el cron corre cada minuto).
 * - Login rechazado: no se reintenta en bucle (la API bloquea la cuenta tras varios intentos).
 * - 5xx o red: espera exponencial (1, 2, 4, 8 min) y aborta al quinto fallo seguido.
 * - Estado de pago con error 63: como máximo una consulta cada 10 minutos.
 */

export const MIN_WAIT_MS = 60_000;
/** Fallos seguidos (5xx/red) que abortan la corrida. */
export const MAX_FAILURES = 5;
/** 429 seguidos que abortan la corrida. */
export const MAX_RATE_LIMITED = 10;
export const PAYMENT_STATUS_MIN_INTERVAL_MS = 10 * 60 * 1000;
/** Código de FREETOUR para «el estado del pago aún no está disponible». */
export const PAYMENT_PENDING_ERROR = 63;

/** Retry-After en milisegundos (segundos o fecha HTTP). null si no viene o no se entiende. */
// REQ-077
export function parseRetryAfter(header: string | null | undefined, now: Date): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - now.getTime());
}

export type RetryPlan = { action: "wait"; notBefore: Date } | { action: "abort"; reason: string };

/**
 * Qué hacer tras un fallo al leer el feed.
 * status 0 = error de red o desconocido. failures = fallos seguidos antes de este.
 */
// REQ-077
export function planRetry({ status, retryAfter, login, failures, now }: {
  status: number;
  retryAfter: string | null;
  login: boolean;
  failures: number;
  now: Date;
}): RetryPlan {
  const wait = (ms: number): RetryPlan => ({ action: "wait", notBefore: new Date(now.getTime() + Math.max(MIN_WAIT_MS, ms)) });
  if (status === 429) {
    if (failures + 1 >= MAX_RATE_LIMITED) return { action: "abort", reason: "rate-limit" };
    return wait(parseRetryAfter(retryAfter, now) ?? MIN_WAIT_MS);
  }
  if (login && status >= 400 && status < 500) return { action: "abort", reason: "login" };
  if (status === 0 || status >= 500) {
    if (failures + 1 >= MAX_FAILURES) return { action: "abort", reason: "error" };
    return wait(MIN_WAIT_MS * 2 ** failures);
  }
  return { action: "abort", reason: `http-${status}` };
}

/** ¿Se puede volver a consultar el estado del pago? (error 63 = máximo cada 10 min). */
// REQ-077
export function canCheckPaymentStatus({ lastErrorCode, lastAttemptAt, now }: {
  lastErrorCode: number | null;
  lastAttemptAt: Date | null;
  now: Date;
}): boolean {
  if (lastErrorCode !== PAYMENT_PENDING_ERROR || !lastAttemptAt) return true;
  return now.getTime() - lastAttemptAt.getTime() >= PAYMENT_STATUS_MIN_INTERVAL_MS;
}
