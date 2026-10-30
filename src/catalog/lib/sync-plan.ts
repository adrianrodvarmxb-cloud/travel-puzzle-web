/**
 * Decide qué hace cada ejecución del cron de sincronización del catálogo.
 *
 * El catálogo (~81 páginas de 100 tours) se sincroniza una página por ejecución,
 * cada minuto entre las 3:00 y las 4:59 a. m. de Ciudad de México. Así cada
 * ejecución queda muy por debajo de los límites de Cloudflare.
 * Función pura: sin red ni base de datos.
 */
export interface SyncState {
  status: string;
  nextPage: number;
  totalPages: number;
  runStartedAt: Date | null;
}

export type SyncStep =
  | { action: "start"; page: 1 }
  | { action: "page"; page: number }
  | { action: "finish" }
  | { action: "idle" };

const MEXICO_OFFSET_MS = -6 * 60 * 60 * 1000; // CDMX no tiene horario de verano

/** Fecha (YYYY-MM-DD) en Ciudad de México. */
export function mexicoDay(date: Date): string {
  return new Date(date.getTime() + MEXICO_OFFSET_MS).toISOString().slice(0, 10);
}

export function planSyncStep(state: SyncState | null, now: Date): SyncStep {
  if (!state || !state.runStartedAt || mexicoDay(state.runStartedAt) !== mexicoDay(now)) {
    return { action: "start", page: 1 };
  }
  if (state.status === "completed") return { action: "idle" };
  if (state.totalPages > 0 && state.nextPage > state.totalPages) return { action: "finish" };
  return { action: "page", page: state.nextPage };
}
