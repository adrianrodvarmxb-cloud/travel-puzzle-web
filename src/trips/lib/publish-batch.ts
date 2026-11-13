/**
 * REQ-1347 (DATOS): publicar en lote viajes en draft de una agencia, por workflow y con regreso. Puro.
 * Revisa lo que pide el PO (título, precio, destino, imagen) más la lista del gestor (`publishChecklist`, gate J),
 * y arma el SQL: solo UPDATE por id, de esa agencia y en draft (igual que publicar desde el gestor: bloquea el código).
 */
import { publishChecklist, type PublishInput } from "./publish";
import { IMAGE_KEY_RE } from "./image";

const JSON_FIELDS = ["highlights", "includes", "excludes", "countries", "cities", "languages", "options", "meetingPoints", "images", "dates", "itinerary", "extras", "availability", "cancellation", "translations"] as const;
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const ISO_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|\+00:00)$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type BatchTrip = Omit<PublishInput, "images"> & { id: string; slug: string; agencyId: string | null; status: string; codeLocked: number; priceFrom: number | null; cities: string[]; updatedAt: string; images: { key?: string }[] };

const arr = (v: unknown) => (Array.isArray(v) ? v : []);

/** REQ-1347: fila de `wrangler d1 execute --json` (JSON como texto, booleanos 0/1) → datos para revisar. */
// REQ-1347
export function parseD1TripRow(r: Record<string, unknown>): BatchTrip {
  const j: Record<string, unknown> = {};
  for (const k of JSON_FIELDS) {
    const v = r[k];
    try { j[k] = typeof v === "string" ? JSON.parse(v) : v; } catch { j[k] = null; }
  }
  return {
    id: String(r.id), slug: String(r.slug ?? ""), agencyId: (r.agencyId as string | null) ?? null, status: String(r.status), codeLocked: Number(r.codeLocked ?? 0),
    kind: String(r.kind) as PublishInput["kind"], titleEs: String(r.titleEs ?? ""), summaryEs: String(r.summaryEs ?? ""), descriptionEs: String(r.descriptionEs ?? ""),
    highlights: arr(j.highlights), includes: arr(j.includes), excludes: arr(j.excludes), countries: arr(j.countries), cities: arr(j.cities),
    durationDays: r.durationDays == null ? null : Number(r.durationDays), priceFrom: r.priceFrom == null ? null : Number(r.priceFrom),
    languages: arr(j.languages), options: arr(j.options), meetingPoints: arr(j.meetingPoints) as PublishInput["meetingPoints"],
    images: arr(j.images) as { key?: string }[], updatedAt: String(r.updatedAt ?? ""),
  };
}

/** REQ-1347: qué le falta para publicarse (vacío = se publica). */
// REQ-1347
export function checkForPublish(t: BatchTrip): string[] {
  const m = publishChecklist(t);
  if (!(t.priceFrom !== null && t.priceFrom > 0)) m.push("precio");
  if (!t.cities.some((c) => typeof c === "string" && c.trim())) m.push("ciudad");
  if (!t.countries.length || !t.countries.every((c) => /^[A-Z]{2}$/.test(String(c)))) m.push("país ISO-2");
  if (!t.images.length || !t.images.every((i) => IMAGE_KEY_RE.test(String(i?.key ?? "")))) m.push("foto válida");
  if (!SLUG.test(t.slug)) m.push("slug");
  return m;
}

function guard(id: string, ts: string) {
  if (!SAFE_ID.test(id)) throw new Error(`id inválido: ${id}`);
  if (!ISO_TS.test(ts)) throw new Error(`fecha inválida: ${ts}`);
}

/** REQ-1347: un UPDATE por viaje; nada más. */
// REQ-1347
export function publishSql(ids: readonly string[], agencyId: string, nowIso: string): string[] {
  if (!SAFE_ID.test(agencyId)) throw new Error(`agencia inválida: ${agencyId}`);
  return ids.map((id) => {
    guard(id, nowIso);
    return `UPDATE "Trip" SET "status" = 'published', "codeLocked" = 1, "updatedAt" = '${nowIso}' WHERE "id" = '${id}' AND "agencyId" = '${agencyId}' AND "status" = 'draft';`;
  });
}

/** REQ-1347: regreso fila por fila al estado del respaldo (no toca el resto de la base, a diferencia de Time Travel). */
// REQ-1347
export function restoreSql(rows: readonly { id: string; status: string; codeLocked: number; updatedAt: string }[]): string[] {
  return rows.map((r) => {
    guard(r.id, r.updatedAt);
    if (!["draft", "published", "hidden", "unlisted"].includes(r.status)) throw new Error(`status inválido: ${r.status}`);
    return `UPDATE "Trip" SET "status" = '${r.status}', "codeLocked" = ${r.codeLocked ? 1 : 0}, "updatedAt" = '${r.updatedAt}' WHERE "id" = '${r.id}';`;
  });
}
