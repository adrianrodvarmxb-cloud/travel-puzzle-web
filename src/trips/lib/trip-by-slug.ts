/**
 * REQ-306: ficha de un viaje propio por slug. Puro: la base, la caché y el reintento se inyectan.
 * Observación del 6 nov 2026 (docs/incidentes/OBS-2026-11-06-ficha-viaje-500.md): un 500 aislado en una
 * ficha mientras se importaban 148 viajes; la carga no tenía reintento ni caché y corría dos veces por petición.
 */
import type { StoredTrip } from "../manage";
import type { Translations } from "./translation";
import type { Visibility } from "./visibility";
import { isPubliclyReachable } from "./trip";

export interface TripRow { id: string; status: string; kind: string; agencyId: string | null; translations: unknown }

export interface TripBySlugDeps {
  vis: Visibility;
  isKindVisible: (kind: string, vis: Visibility) => boolean;
  findRowBySlug: (slug: string) => Promise<TripRow | null>;
  findTripById: (id: string) => Promise<StoredTrip | null>;
  findAgencyName: (agencyId: string) => Promise<string | null>;
}

export interface TripBySlug { trip: StoredTrip; translations: Translations; agencyName: string | null }

/** Mismas reglas que antes: solo publicados y de un tipo visible. */
export async function loadPublishedTripBySlug(slug: string, d: TripBySlugDeps): Promise<TripBySlug | null> {
  const row = await d.findRowBySlug(slug);
  if (!row || !isPubliclyReachable(row.status) /* REQ-3535 */ || !d.isKindVisible(row.kind, d.vis)) return null;
  const trip = await d.findTripById(row.id);
  if (!trip) return null;
  const agencyName = row.agencyId ? await d.findAgencyName(row.agencyId) : null;
  return { trip, translations: (row.translations ?? {}) as Translations, agencyName };
}

/** Caché compartida (una consulta por llave, también entre metadatos y página) + reintento ante D1 saturada. */
export function createTripBySlugLoader(d: {
  load: (slug: string) => Promise<TripBySlug | null>;
  key: (slug: string) => string;
  cache: <T>(key: string, load: () => Promise<T>) => Promise<T>;
  retry: <T>(fn: () => Promise<T>) => Promise<T>;
}) {
  return (slug: string) => d.cache(d.key(slug), () => d.retry(() => d.load(slug))).then(reviveTripDates);
}

/** La copia de la caché compartida viaja como JSON: las fechas regresan como texto y aquí vuelven a ser Date. */
export function reviveTripDates<T extends TripBySlug | null>(data: T): T {
  if (!data) return data;
  const t = data.trip as StoredTrip & { createdAt?: unknown; updatedAt?: unknown };
  const date = (v: unknown) => (typeof v === "string" ? new Date(v) : v);
  return { ...data, trip: { ...t, ...("createdAt" in t && { createdAt: date(t.createdAt) }), ...("updatedAt" in t && { updatedAt: date(t.updatedAt) }) } };
}
