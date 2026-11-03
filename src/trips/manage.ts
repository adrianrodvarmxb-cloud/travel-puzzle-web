/**
 * Gestor de viajes: crear, editar y cambiar estado. Nunca se borra (se oculta).
 * Recibe el almacenamiento por parámetro.
 */
import { slugify, normalizeDates, missingToPublish, type TripStatus } from "./lib/trip";
import type { TripInput } from "./schemas/trip";

export type StoredTrip = TripInput & { id: string; slug: string; status: TripStatus | string };
type TripData = TripInput & { slug: string };

export interface TripsDeps {
  findById(id: string): Promise<StoredTrip | null>;
  findByCode(code: string): Promise<StoredTrip | null>;
  create(data: TripData & { status: TripStatus }): Promise<StoredTrip>;
  update(id: string, data: TripData): Promise<StoredTrip>;
  setStatus(id: string, status: TripStatus): Promise<void>;
}

export type TripResult = { ok: true; trip: StoredTrip } | { ok: false; error: string };

const publishError = (missing: string[]) => `Para publicar falta: ${missing.join(", ")}`;

/** Crea (id null, queda en borrador) o edita un viaje. */
export async function saveTrip(id: string | null, input: TripInput, d: TripsDeps): Promise<TripResult> {
  const dates = normalizeDates(input.dates);
  if (!dates.ok) return { ok: false, error: dates.error };

  const sameCode = await d.findByCode(input.code);
  if (sameCode && sameCode.id !== id) return { ok: false, error: `Ya existe un viaje con el código ${input.code}` };

  const data: TripData = { ...input, dates: dates.dates, slug: slugify(input.titleEs, input.code) };
  if (!id) return { ok: true, trip: await d.create({ ...data, status: "draft" }) };

  const current = await d.findById(id);
  if (!current) return { ok: false, error: "No encontramos ese viaje" };
  // Un viaje publicado no puede quedar incompleto en el sitio.
  if (current.status === "published") {
    const missing = missingToPublish(data);
    if (missing.length) return { ok: false, error: publishError(missing) };
  }
  return { ok: true, trip: await d.update(id, data) };
}

/** Publicar exige lo mínimo; ocultar o regresar a borrador siempre se puede. */
export async function setTripStatus(id: string, status: TripStatus, d: TripsDeps): Promise<{ ok: true } | { ok: false; error: string }> {
  const trip = await d.findById(id);
  if (!trip) return { ok: false, error: "No encontramos ese viaje" };
  if (status === "published") {
    const missing = missingToPublish(trip);
    if (missing.length) return { ok: false, error: publishError(missing) };
  }
  await d.setStatus(id, status);
  return { ok: true };
}
