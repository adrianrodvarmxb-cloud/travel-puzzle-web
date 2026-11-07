/**
 * REQ-340…342: registra búsquedas y clics agregados por día (I/O). Tras SEARCH_LOG_ENABLED (apagado por defecto).
 * Recibe la base y el reloj por parámetro (DIP). Nunca tumba la página: si la tabla no existe (migración sin
 * aplicar) o D1 falla, se registra una línea en los logs del Worker y se sigue.
 */
import { logStatement, type LogEvent } from "./lib/search-log";

/** Interruptor SEARCH_LOG_ENABLED (apagado por defecto). */
export const isSearchLog = (v: string | undefined) => v === "true";

export interface LogDb { prepare(sql: string): { bind(...v: unknown[]): { run(): Promise<unknown> } } }
export interface LogDeps { db: () => LogDb; now: () => number; enabled: boolean }

/** true si se escribió; false si se descartó, está apagado o falló. */
// REQ-340 REQ-342
export async function recordSearchEvent(deps: LogDeps, event: LogEvent): Promise<boolean> {
  if (!deps.enabled) return false;
  const st = logStatement(event, deps.now());
  if (!st) return false;
  try {
    await deps.db().prepare(st.sql).bind(...st.params).run();
    return true;
  } catch (error) {
    console.error("[busqueda-log] no se registró:", (error as Error).message);
    return false;
  }
}
