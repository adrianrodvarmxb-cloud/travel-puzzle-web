/** REQ-049: resumen compacto de salidas (idiomas + fechas) y su vigencia. Puro. */
import type { Departure, DepartureSummary } from "./types";

export const HORIZON_DAYS = 60;
export const MAX_AGE_DAYS = 7;

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const lang2 = (l: string) => l.trim().toLowerCase().slice(0, 2);

// REQ-049
export function summarize(list: Departure[], today: string, horizon = HORIZON_DAYS): DepartureSummary {
  const end = addDays(today, horizon);
  const inRange = list.filter((d) => /^\d{4}-\d\d-\d\d$/.test(d.date) && d.date >= today && d.date < end && d.language);
  return {
    languages: [...new Set(inRange.map((d) => lang2(d.language)))].sort(),
    dates: [...new Set(inRange.map((d) => d.date))].sort(),
  };
}

/** El resumen solo vale si se revisó en los últimos 7 días; si no, "sin dato" (null). */
// REQ-049
export function freshSummary(s: DepartureSummary, syncedAt: string | null | undefined, now: Date, maxAgeDays = MAX_AGE_DAYS): DepartureSummary | null {
  if (!syncedAt) return null;
  const t = Date.parse(syncedAt);
  if (!Number.isFinite(t) || now.getTime() - t > maxAgeDays * 864e5) return null;
  return s;
}
