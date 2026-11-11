/**
 * Gestor de viajes: crear, editar y cambiar estado (nunca se borra, se oculta).
 * Código automático (gate H) que se congela al publicar; "Desde" calculado (gate G);
 * checklist GYG para publicar (gate J). Recibe el almacenamiento por parámetro.
 */
import { slugify, type TripStatus } from "./lib/trip";
import { tripCode } from "./lib/code";
import { priceFrom } from "./lib/pricing";
import { publishChecklist } from "./lib/publish";
import type { TripInput } from "./schemas/trip";

type Base = Omit<TripInput, "code" | "priceFrom">;
export type TripData = Base & { code: string; seq: number; codeLocked: boolean; priceFrom: number | null; slug: string };
export type StoredTrip = TripData & { id: string; status: TripStatus | string; /** REQ-1520: nivel 1–5 revisado; no lo edita el gestor. */ difficultyLevel?: number | null };

export interface TripsDeps {
  findById(id: string): Promise<StoredTrip | null>;
  /** Siglas de la agencia (null = Travel Puzzle → "TP"). */
  agencyInitials(agencyId: string | null): Promise<string>;
  /** Siguiente consecutivo para esas siglas. */
  nextSeq(initials: string): Promise<number>;
  create(data: TripData & { status: TripStatus }): Promise<StoredTrip>;
  update(id: string, data: TripData): Promise<StoredTrip>;
  /** lockCode = true al publicar: el código ya no cambia. */
  setStatus(id: string, status: TripStatus, lockCode: boolean): Promise<void>;
}

export type TripResult = { ok: true; trip: StoredTrip } | { ok: false; error: string };
const publishError = (missing: string[]) => `Para publicar falta: ${missing.join(", ")}`;

export async function saveTrip(id: string | null, input: TripInput, d: TripsDeps): Promise<TripResult> {
  const { code: _ignored, priceFrom: _calc, ...base } = input;
  const current = id ? await d.findById(id) : null;
  if (id && !current) return { ok: false, error: "No encontramos ese viaje" };

  let code: string;
  let seq: number;
  if (current?.codeLocked) {
    ({ code, seq } = current);
  } else {
    const initials = await d.agencyInitials(base.agencyId);
    // Mismo consecutivo mientras no cambie la agencia.
    const sameAgency = current && current.agencyId === base.agencyId;
    seq = sameAgency ? current.seq : await d.nextSeq(initials);
    code = tripCode({ initials, countries: base.countries, kind: base.kind, durationDays: base.durationDays, seq });
  }

  const data: TripData = { ...base, code, seq, codeLocked: current?.codeLocked ?? false, priceFrom: priceFrom(base.options), slug: slugify(base.titleEs, code) };
  if (!current) return { ok: true, trip: await d.create({ ...data, status: "draft" }) };

  if (current.status === "published") {
    const missing = publishChecklist(data);
    if (missing.length) return { ok: false, error: publishError(missing) };
  }
  return { ok: true, trip: await d.update(current.id, data) };
}

export async function setTripStatus(id: string, status: TripStatus, d: TripsDeps): Promise<{ ok: true } | { ok: false; error: string }> {
  const trip = await d.findById(id);
  if (!trip) return { ok: false, error: "No encontramos ese viaje" };
  if (status === "published") {
    const missing = publishChecklist(trip);
    if (missing.length) return { ok: false, error: publishError(missing) };
  }
  await d.setStatus(id, status, status === "published");
  return { ok: true };
}
