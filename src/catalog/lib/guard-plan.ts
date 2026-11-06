import { mexicoDay, mexicoHour, DAILY_START_HOUR } from "./sync-plan";

/**
 * Plan del sync blindado (SYNC_GUARD_ENABLED). Puro.
 * Fases de una corrida: staging (lee páginas a TourStage) → close (barrera de cordura)
 * → publishing (pasa a Tour lo que cambió, 100 por minuto) → succeeded | aborted.
 */

export type RunStatus = "staging" | "publishing" | "succeeded" | "aborted";

export interface RunState {
  id: string;
  status: RunStatus;
  startedAt: Date;
  nextPage: number;
  totalPages: number;
  failures: number;
  notBefore: Date | null;
  publishCursor: number;
  baseline: number;
  abortReason: string | null;
}

export type GuardStep =
  | { action: "start" }
  | { action: "page"; page: number }
  | { action: "close" }
  | { action: "publish" }
  | { action: "wait"; until: Date }
  | { action: "idle" };

/** Bandera del sync blindado: solo "true" la enciende. */
// REQ-071
export function isSyncGuardEnabled(value: string | undefined): boolean {
  return value === "true";
}

// REQ-072
export function planGuardedStep(run: RunState | null, now: Date): GuardStep {
  if (!run) return { action: "start" };
  // Una publicación empezada se termina siempre (cada paso es atómico).
  if (run.status === "publishing") return { action: "publish" };
  const newDay = mexicoDay(run.startedAt) !== mexicoDay(now) && mexicoHour(now) >= DAILY_START_HOUR;
  if (newDay) return { action: "start" };
  if (run.status === "succeeded" || run.status === "aborted") return { action: "idle" };
  if (run.notBefore && now.getTime() < run.notBefore.getTime()) return { action: "wait", until: run.notBefore };
  if (run.totalPages > 0 && run.nextPage > run.totalPages) return { action: "close" };
  return { action: "page", page: run.nextPage };
}

/** Horas sin un sync exitoso para alertar. */
export const ALERT_AFTER_HOURS = 26;

/** Salud del sync: horas desde el último sync exitoso y si toca alertar. */
// REQ-078
export function syncHealth(lastSuccessAt: Date | null, now: Date): {
  lastSuccessAt: string | null;
  hoursSinceLastSuccess: number | null;
  alert: boolean;
} {
  if (!lastSuccessAt) return { lastSuccessAt: null, hoursSinceLastSuccess: null, alert: true };
  const hours = (now.getTime() - lastSuccessAt.getTime()) / 3_600_000;
  return { lastSuccessAt: lastSuccessAt.toISOString(), hoursSinceLastSuccess: Math.round(hours * 10) / 10, alert: hours > ALERT_AFTER_HOURS };
}
