/**
 * REQ-049: sync escalonado de salidas (una tanda por tick del cron, cada tour como máximo una vez al día).
 * Recibe la fuente (adaptador del proveedor) y el repositorio por parámetro.
 */
import type { DepartureSource, DepartureSummary } from "./lib/types";
import { summarize } from "./lib/summary";

export interface DeparturesRepo {
  /** Tours activos sin revisar desde `before` (los más viejos primero). */
  dueTours(limit: number, before: Date): Promise<{ id: string; externalId: number }[]>;
  saveSummary(id: string, s: DepartureSummary, at: Date): Promise<void>;
  markChecked(id: string, at: Date): Promise<void>;
}

export const RECHECK_HOURS = 20;

// REQ-049
export async function runDeparturesStep({ source, repo, now, batch }: { source: Pick<DepartureSource, "list">; repo: DeparturesRepo; now: Date; batch: number }) {
  const due = await repo.dueTours(batch, new Date(now.getTime() - RECHECK_HOURS * 3600 * 1000));
  const today = now.toISOString().slice(0, 10);
  let processed = 0, failed = 0;
  for (const t of due) {
    try {
      await repo.saveSummary(t.id, summarize(await source.list(t.externalId), today), now);
      processed++;
    } catch (e) {
      console.error(`[salidas] tour ${t.externalId}:`, (e as Error).message);
      await repo.markChecked(t.id, now);
      failed++;
    }
  }
  return { processed, failed };
}
