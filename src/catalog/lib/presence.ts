/**
 * Presencia de un tour en el feed (REQ-074). Pura.
 * active → missing (faltó en una corrida exitosa) → removed (3 corridas exitosas seguidas sin él).
 * Si reaparece vuelve a active. Solo se aplica al cerrar bien una corrida.
 */

export type SyncStatus = "active" | "missing" | "removed";

/** Corridas exitosas seguidas sin el tour para darlo de baja. */
export const REMOVE_AFTER_RUNS = 3;

export interface Presence {
  syncStatus: SyncStatus;
  missingRuns: number;
}

// REQ-074
export function nextPresence(current: Presence, seen: boolean): Presence {
  if (seen) return { syncStatus: "active", missingRuns: 0 };
  if (current.syncStatus === "removed") return current;
  const missingRuns = current.missingRuns + 1;
  return { syncStatus: missingRuns >= REMOVE_AFTER_RUNS ? "removed" : "missing", missingRuns };
}

export interface PresenceInput {
  externalId: number;
  syncStatus: string;
  missingRuns: number;
  /** Hoy el sitio filtra por isActive; un tour desactivado por el sync anterior cuenta como removed. */
  isActive: boolean;
  seen: boolean;
}

export interface PresenceUpdate extends Presence {
  externalId: number;
  isActive: boolean;
}

/** Transiciones de todo el catálogo al cerrar la corrida: solo las filas que cambian. */
// REQ-074
export function presenceTransitions(rows: PresenceInput[]): {
  updates: PresenceUpdate[];
  counts: { missing: number; removed: number; reactivated: number };
} {
  const updates: PresenceUpdate[] = [];
  const counts = { missing: 0, removed: 0, reactivated: 0 };
  for (const row of rows) {
    const status: SyncStatus = !row.isActive ? "removed" : row.syncStatus === "missing" || row.syncStatus === "removed" ? row.syncStatus : "active";
    const current: Presence = { syncStatus: status, missingRuns: status === "removed" ? Math.max(row.missingRuns, REMOVE_AFTER_RUNS) : row.missingRuns };
    const next = nextPresence(current, row.seen);
    const isActive = next.syncStatus !== "removed";
    if (next.syncStatus === "missing") counts.missing++;
    if (next.syncStatus === "removed" && status !== "removed") counts.removed++;
    if (next.syncStatus === "active" && status !== "active") counts.reactivated++;
    const unchanged = next.syncStatus === row.syncStatus && next.missingRuns === row.missingRuns && isActive === row.isActive;
    // Un tour ya dado de baja que sigue sin venir no se toca (aunque su syncStatus guardado sea el de antes de la migración).
    if (unchanged || (status === "removed" && next.syncStatus === "removed")) continue;
    updates.push({ externalId: row.externalId, ...next, isActive });
  }
  return { updates, counts };
}
