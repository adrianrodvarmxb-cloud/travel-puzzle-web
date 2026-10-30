/**
 * Decide qué hace cada ejecución del cron de sincronización del catálogo.
 *
 * El catálogo (~81 páginas de 100 tours) se sincroniza una página por ejecución.
 * El cron corre cada minuto todo el día; la corrida diaria arranca a partir de
 * las 3:00 a. m. de Ciudad de México y, al terminar, los minutos libres se usan
 * para las reseñas. Así cada ejecución queda muy por debajo de los límites de Cloudflare.
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

/** Hora (0-23) a partir de la cual arranca la corrida diaria, en Ciudad de México. */
export const DAILY_START_HOUR = 3;

/** Fecha (YYYY-MM-DD) en Ciudad de México. */
export function mexicoDay(date: Date): string {
  return new Date(date.getTime() + MEXICO_OFFSET_MS).toISOString().slice(0, 10);
}

function mexicoHour(date: Date): number {
  return new Date(date.getTime() + MEXICO_OFFSET_MS).getUTCHours();
}

export function planSyncStep(state: SyncState | null, now: Date): SyncStep {
  if (!state || !state.runStartedAt) return { action: "start", page: 1 };

  const isToday = mexicoDay(state.runStartedAt) === mexicoDay(now);
  // Corrida de un día anterior: antes de la hora de arranque se termina (si quedó a medias)
  // o se espera; después de esa hora arranca la del día.
  if (!isToday && mexicoHour(now) >= DAILY_START_HOUR) return { action: "start", page: 1 };
  if (state.status === "completed") return { action: "idle" };
  if (state.totalPages > 0 && state.nextPage > state.totalPages) return { action: "finish" };
  return { action: "page", page: state.nextPage };
}
