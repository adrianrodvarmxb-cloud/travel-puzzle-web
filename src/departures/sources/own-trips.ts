/** REQ-049: adaptador de viajes propios → salidas, desde su disponibilidad (días, fechas cerradas, anticipación) e idiomas. */
import type { Departure } from "../lib/types";
import { addDays } from "../lib/summary";

export interface OwnTripLike {
  languages: string[];
  availability: { weekdays: number[]; closedDates: string[] };
  minNoticeHours: number;
}

// REQ-049
export function ownTripDepartures(t: OwnTripLike, today: string, horizonDays: number): Departure[] {
  const first = addDays(today, Math.ceil((t.minNoticeHours ?? 0) / 24));
  const closed = new Set(t.availability.closedDates ?? []);
  const days = t.availability.weekdays ?? [];
  const out: Departure[] = [];
  for (let i = 0; i < horizonDays; i++) {
    const date = addDays(today, i);
    if (date < first || closed.has(date)) continue;
    if (days.length && !days.includes(new Date(`${date}T00:00:00Z`).getUTCDay())) continue;
    for (const language of t.languages) out.push({ date, language });
  }
  return out;
}
