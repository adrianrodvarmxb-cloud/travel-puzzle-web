/** REQ-049: adaptador Freetour → salidas, desde GET /tours/{id}/events (Freetour pide leerlo de forma periódica). */
import type { Departure, DepartureSource } from "../lib/types";

type RawEvent = { date?: string; language?: string };

// REQ-049
export function parseFreetourEvents(body: unknown): Departure[] {
  const data = (body as { data?: unknown })?.data;
  const list = (Array.isArray(data) ? data : ((data as { events?: unknown[] })?.events ?? [])) as RawEvent[];
  return list
    .filter((e) => typeof e?.date === "string" && e.date.length >= 10 && typeof e.language === "string" && e.language)
    .map((e) => ({ date: e.date!.slice(0, 10), language: e.language! }));
}

export function freetourSource(api: { get(path: string): Promise<unknown> }): DepartureSource {
  return { list: async (externalId) => parseFreetourEvents(await api.get(`/tours/${externalId}/events`)) };
}
