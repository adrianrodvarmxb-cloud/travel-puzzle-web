/**
 * REQ-584: viajes cuya ficha canónica es /viajes/{destino}/{slug} (su ciudad no tiene ficha bajo /destinos, así
 * que el middleware no los redirige). Puro. Los que viven bajo /destinos ya salen en sitemap-tours-{pais}.xml.
 */
import { tripPath } from "@/trips/lib/public";

export interface ViajeRow { id: string; slug: string; kind?: string; countries: string[]; updatedAt: string }

// REQ-584
export function viajesSitemapTrips(rows: ViajeRow[], placedIds: Set<string>, visible: (kind: string) => boolean): { path: string; updatedAt: string }[] {
  return rows
    .filter((r) => r.slug && !placedIds.has(r.id) && visible(r.kind ?? ""))
    .map((r) => ({ path: tripPath(r), updatedAt: r.updatedAt }))
    .sort((a, b) => a.path.localeCompare(b.path));
}
