/** Solo horarios que no han pasado (Freetour también devuelve algunos pasados). Puro. */
// REQ-016
export function upcomingEvents<T extends { utcDate?: string; date?: string }>(events: T[], nowMs: number): T[] {
  return events.filter((e) => {
    // Sin utcDate se usa la hora local del tour (diferencia de horas, nunca vacía el calendario).
    const t = Date.parse(`${(e.utcDate || e.date || "").replace(" ", "T")}Z`);
    return Number.isFinite(t) && t > nowMs;
  });
}
