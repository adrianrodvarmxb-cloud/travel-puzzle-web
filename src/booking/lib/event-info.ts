/** Fecha local, UTC e idioma de un evento, tomados de GET /tours/{id}/events de Freetour. */
export interface EventInfo {
  date: string;
  utcDate: string;
  language: string;
}

export function findEventInfo(body: unknown, eventId: number): EventInfo | null {
  const data = (body as { data?: unknown })?.data;
  const list = Array.isArray(data) ? data : ((data as { events?: unknown[] })?.events ?? []);
  const ev = (list as { id: number; date: string; utcDate: string; language: string }[]).find((e) => e.id === eventId);
  return ev ? { date: ev.date, utcDate: ev.utcDate, language: ev.language } : null;
}
