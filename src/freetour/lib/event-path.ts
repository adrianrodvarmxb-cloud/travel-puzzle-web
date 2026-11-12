import type { FreetourApiVersion } from "./hosts";

/**
 * REQ-3495: la especificación v2.2 de Freetour cambió GET /event/{id} por GET /events/{id}.
 * Con FREETOUR_API_VERSION en 2.0 o 2.1 se usa la ruta de siempre. Puro.
 */
// REQ-3495
export function eventDetailPath(version: FreetourApiVersion | "2.1", id: number | string): string {
  const seg = encodeURIComponent(String(id));
  return version === "2.2" ? `/events/${seg}` : `/event/${seg}`;
}
