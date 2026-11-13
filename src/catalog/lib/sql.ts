import { upsertRows, sqlValue, MAX_PARAMS, type Stmt } from "@/lib/d1/batch";
import type { TourRow, TranslationRow } from "./tour-rows";
import type { StageKind } from "./content-hash";
import type { PresenceUpdate } from "./presence";
import { DEFAULT_PROVIDER } from "@/destinations/lib/ids";

/**
 * REQ-3461: un tour se identifica por (`providerId`, `externalId`), no por `externalId` solo.
 * Esa es la llave compuesta que ya existe en la base desde REQ-085 y que la migración 0026 deja
 * como única (quita `Tour_externalId_key`). Hasta la 0026 este escritor también funciona: mientras
 * solo haya tours de Freetour el índice viejo no estorba; un tour de OTRO proveedor con un número
 * ya usado falla al insertar (UNIQUE), que es lo que se quiere — fallar, no escribir a medias.
 */
const TOUR_KEY = ["providerId", "externalId"] as const;

const TOUR_FIELDS = [
  "providerId", "externalId", "providerTitle", "providerPhone", "priceValue", "priceCurrency", "duration", "durationMinutes",
  "titleImageURL", "categoryId", "rating", "reviewsNumber", "cityId", "countryId", "meetingPoint", "includes", "POIs", "images",
  "videoURL", "isActive", "lastSeenAt",
] as const;

/** Fila de tour de cualquier proveedor. Sin `providerId` es de Freetour, como el DEFAULT de la columna. */
export type ProviderTourRow = TourRow & { providerId?: string };

/** REQ-3461: el proveedor de una fila; por omisión, Freetour. */
// REQ-3461
export function rowProvider(tour: ProviderTourRow): string {
  return (tour.providerId ?? "").trim() || DEFAULT_PROVIDER;
}

/**
 * Sentencias para guardar una página de tours y sus traducciones en un solo batch.
 * Los tours nuevos reciben un id nuevo; los existentes conservan el suyo.
 * REQ-3461: sirve a cualquier proveedor; el conflicto se resuelve por (proveedor, número).
 */
// REQ-3461
export function tourStatements(
  rows: { tour: ProviderTourRow; translations: TranslationRow[] }[],
  now: Date,
  newId: () => string
): Stmt[] {
  return buildTourStatements(rows, now, newId, [], () => []);
}

/** Igual que tourStatements, más columnas extra por fila (el sync blindado agrega contentHash). */
// REQ-3461
function buildTourStatements<R extends { tour: ProviderTourRow; translations: TranslationRow[] }>(
  rows: R[],
  now: Date,
  newId: () => string,
  extraColumns: string[],
  extraValues: (row: R) => unknown[]
): Stmt[] {
  const columns = ["id", ...TOUR_FIELDS, ...extraColumns, "updatedAt", "createdAt"];
  const value = (tour: ProviderTourRow, field: (typeof TOUR_FIELDS)[number]) =>
    field === "providerId" ? rowProvider(tour) : tour[field];
  const tourRows = rows.map((r) => [newId(), ...TOUR_FIELDS.map((f) => value(r.tour, f)), ...extraValues(r), now, now]);
  // La llave no se actualiza a sí misma.
  const update = [...TOUR_FIELDS.filter((f) => !TOUR_KEY.includes(f as (typeof TOUR_KEY)[number])), ...extraColumns, "updatedAt"];
  const tours = upsertRows("Tour", columns, tourRows, [...TOUR_KEY], update);

  // Una sentencia por tour (6 idiomas × 8 valores = 48 parámetros).
  const translations: Stmt[] = rows
    .filter(({ translations }) => translations.length > 0)
    .map(({ tour, translations }) => ({
      sql:
        'INSERT INTO "TourTranslation" ("id", "tourId", "language", "title", "brief", "description", "url") VALUES ' +
        translations.map(() => '(?, (SELECT "id" FROM "Tour" WHERE "providerId" = ? AND "externalId" = ?), ?, ?, ?, ?, ?)').join(", ") +
        ' ON CONFLICT ("tourId", "language") DO UPDATE SET "title" = excluded."title", "brief" = excluded."brief",' +
        ' "description" = excluded."description", "url" = excluded."url"',
      params: translations
        .flatMap((tr) => [newId(), rowProvider(tour), tour.externalId, tr.language, tr.title, tr.brief, tr.description, tr.url])
        .map(sqlValue),
    }));

  return [...tours, ...translations];
}

/**
 * REQ-3462: alta y actualización de países, con `iso2`.
 *
 * `upsertCountries` nunca escribía `iso2`, así que un país que solo trae un proveedor (Paraguay,
 * REQ-3441/REQ-3442) quedaba sin ISO-2 y su página `/destinos/py` no se formaba. Aquí sí se escribe.
 *
 * `iso2` SOLO se llena: `COALESCE(excluded."iso2", "Country"."iso2")`. Así la corrida de Freetour,
 * que manda sus países sin `iso2` en cada arranque, no borra el que ya llenaron la 0015 y el cruce
 * de GeoNames. `Country.iso2` es único en la base: un ISO-2 que ya es de otra fila hace fallar la
 * sentencia (no se escribe nada) en vez de dejar dos países con el mismo ISO-2.
 */
// REQ-3462
export function countryStatements(
  rows: readonly { id: number; code: string; iso2?: string | null; translations: unknown }[]
): Stmt[] {
  if (rows.length === 0) return [];
  const columns = ["id", "code", "iso2", "translations"];
  const perStmt = Math.max(1, Math.floor(MAX_PARAMS / columns.length));
  const head = `INSERT INTO "Country" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES `;
  const tail =
    ' ON CONFLICT ("id") DO UPDATE SET "code" = excluded."code",' +
    ' "iso2" = COALESCE(excluded."iso2", "Country"."iso2"), "translations" = excluded."translations"';
  const stmts: Stmt[] = [];
  for (let i = 0; i < rows.length; i += perStmt) {
    const chunk = rows.slice(i, i + perStmt);
    stmts.push({
      sql: head + chunk.map(() => "(?, ?, ?, ?)").join(", ") + tail,
      params: chunk.flatMap((c) => [c.id, c.code, (c.iso2 ?? "").trim().toUpperCase() || null, c.translations]).map(sqlValue),
    });
  }
  return stmts;
}

/**
 * REQ-3463: alta de ciudades NUEVAS de un proveedor, con su `slug` y su `geonameid`.
 *
 * `ON CONFLICT ("id") DO NOTHING` a propósito: REQ-130 dice que una ciudad que ya existe nunca se
 * reescribe, para que un nombre corregido a mano (Moscatel → Mascate) sobreviva al sync. El plan de
 * ciudades (REQ-3367/3368) ya decidió cuáles son nuevas; si una se colara, aquí no pasa nada.
 */
// REQ-3463
export function cityStatements(
  rows: readonly { id: number; countryId: number; translations: unknown; slug?: string | null; geonameid?: number | null }[]
): Stmt[] {
  return upsertRows(
    "City",
    ["id", "countryId", "translations", "slug", "geonameid"],
    rows.map((c) => [c.id, c.countryId, c.translations, c.slug ?? null, c.geonameid ?? null]),
    ["id"],
    [] // DO NOTHING
  );
}

// ───────────── Sync blindado (SYNC_GUARD_ENABLED, migración 0014) ─────────────

export interface StagedRow {
  externalId: number;
  hash: string;
  kind: StageKind;
  /** new/changed: { tour, translations }; rating: { rating, reviewsNumber }; same: null. */
  payload: unknown;
}

export interface RatingRow {
  externalId: number;
  rating: number | null;
  reviewsNumber: number;
}

/** Publica tours nuevos o cambiados con su contentHash. */
// REQ-073
export function publishTourStatements(
  rows: { tour: TourRow; translations: TranslationRow[]; hash: string }[],
  now: Date,
  newId: () => string
): Stmt[] {
  return buildTourStatements(rows, now, newId, ["contentHash"], (r) => [r.hash]);
}

/**
 * Solo calificación y reseñas: no cambia updatedAt (no es un cambio de contenido).
 * REQ-3461: acotado al proveedor, para que una reseña de Freetour no caiga en un tour de Tangol
 * con el mismo número una vez aplicada la 0026.
 */
// REQ-073 REQ-3461
export function ratingStatements(rows: RatingRow[], provider: string = DEFAULT_PROVIDER): Stmt[] {
  return rows.map((r) => ({
    sql: 'UPDATE "Tour" SET "rating" = ?, "reviewsNumber" = ? WHERE "providerId" = ? AND "externalId" = ?',
    params: [r.rating, r.reviewsNumber, provider, r.externalId].map(sqlValue),
  }));
}

/** Guarda una página en el staging de la corrida. No toca "Tour". */
// REQ-071
export function stageStatements(runId: string, rows: StagedRow[], now: Date): Stmt[] {
  return upsertRows(
    "TourStage",
    ["runId", "externalId", "hash", "kind", "payload", "createdAt"],
    rows.map((r) => [runId, r.externalId, r.hash, r.kind, r.payload, now]),
    ["runId", "externalId"],
    ["hash", "kind", "payload"]
  );
}

/** Respaldo: la fila de Tour tal como estaba, justo antes de sobrescribirla. */
// REQ-072
export function backupStatements(runId: string, rows: { externalId: number; previous: unknown }[]): Stmt[] {
  return rows.map((r) => ({
    sql: 'UPDATE "TourStage" SET "previous" = ? WHERE "runId" = ? AND "externalId" = ?',
    params: [sqlValue(r.previous), runId, r.externalId],
  }));
}

/**
 * Transiciones de presencia agrupadas por estado (máximo 100 parámetros por sentencia).
 * REQ-3461: acotadas al proveedor de la corrida; nunca desactivan los tours de otro proveedor.
 */
// REQ-074 REQ-3461
export function presenceStatements(updates: PresenceUpdate[], provider: string = DEFAULT_PROVIDER): Stmt[] {
  const groups = new Map<string, PresenceUpdate[]>();
  for (const u of updates) {
    const key = `${u.syncStatus}|${u.missingRuns}|${u.isActive}`;
    groups.set(key, [...(groups.get(key) ?? []), u]);
  }
  const perStmt = MAX_PARAMS - 4;
  const stmts: Stmt[] = [];
  for (const list of groups.values()) {
    const { syncStatus, missingRuns, isActive } = list[0];
    for (let i = 0; i < list.length; i += perStmt) {
      const ids = list.slice(i, i + perStmt).map((u) => u.externalId);
      stmts.push({
        sql: `UPDATE "Tour" SET "syncStatus" = ?, "missingRuns" = ?, "isActive" = ? WHERE "providerId" = ? AND "externalId" IN (${ids.map(() => "?").join(", ")})`,
        params: [syncStatus, missingRuns, sqlValue(isActive), provider, ...ids],
      });
    }
  }
  return stmts;
}

/**
 * Slug de un tour nuevo (REQ-086). Solo llena el vacío; el trigger Tour_slug_inmutable impide cambiar uno guardado.
 * REQ-3461: acotado al proveedor, para no poner el slug de un tour de Freetour en uno de Tangol.
 */
// REQ-086 REQ-3461
export function slugStatements(slugs: { externalId: number; slug: string }[], provider: string = DEFAULT_PROVIDER): Stmt[] {
  return slugs.map((s) => ({
    sql: 'UPDATE "Tour" SET "slug" = ? WHERE "providerId" = ? AND "externalId" = ? AND "slug" IS NULL',
    params: [s.slug, provider, s.externalId],
  }));
}

/** REQ-090: estado de indexación de cada ciudad que cambió (City.indexableSince / failingSince). */
// REQ-090
export function cityIndexStatements(updates: { id: number; indexableSince: string | null; failingSince: string | null }[]): Stmt[] {
  const d = (iso: string | null) => (iso ? sqlValue(new Date(iso)) : null);
  return updates.map((u) => ({ sql: 'UPDATE "City" SET "indexableSince" = ?, "failingSince" = ? WHERE "id" = ?', params: [d(u.indexableSince), d(u.failingSince), u.id] }));
}

export interface PublishInput {
  runId: string;
  startedAt: Date;
  now: Date;
  newId: () => string;
  tours: { tour: TourRow; translations: TranslationRow[]; hash: string }[];
  ratings: RatingRow[];
  /** REQ-086: slugs de los tours nuevos de este paso (se escriben después de insertarlos). */
  slugs?: { externalId: number; slug: string }[];
  backups: { externalId: number; previous: unknown }[];
  /** Último externalId publicado en este paso. */
  cursor: number;
  /** Solo en el último paso: presencia, cierre de la corrida y checkpoint. */
  finalize: null | {
    updates: PresenceUpdate[];
    counts: { missing: number; removed: number; reactivated: number };
    seen: number;
    totalPages: number;
  };
}

/**
 * Un paso de publicación en UN solo batch de D1 (atómico): respaldo → tours → calificaciones
 * → cursor; y en el último paso, además, presencia → corrida exitosa → checkpoint.
 * Si el batch falla no se aplica nada y el siguiente minuto lo repite.
 */
// REQ-072
export function publishBatch(p: PublishInput): Stmt[] {
  const stmts: Stmt[] = [
    ...backupStatements(p.runId, p.backups),
    ...publishTourStatements(p.tours, p.now, p.newId),
    ...slugStatements(p.slugs ?? []),
    ...ratingStatements(p.ratings),
  ];
  if (!p.finalize) {
    stmts.push({ sql: 'UPDATE "SyncRun" SET "publishCursor" = ?, "updatedAt" = ? WHERE "id" = ?', params: [p.cursor, sqlValue(p.now), p.runId] });
    return stmts;
  }
  const { updates, counts, seen, totalPages } = p.finalize;
  stmts.push(...presenceStatements(updates));
  stmts.push({
    sql:
      'UPDATE "SyncRun" SET "status" = \'succeeded\', "finishedAt" = ?, "publishCursor" = ?, "missing" = ?, "removed" = ?, "reactivated" = ?, "updatedAt" = ? WHERE "id" = ?',
    params: [sqlValue(p.now), p.cursor, counts.missing, counts.removed, counts.reactivated, sqlValue(p.now), p.runId],
  });
  // Checkpoint: solo aquí, cuando la corrida terminó bien.
  stmts.push(
    ...upsertRows(
      "SyncMetadata",
      ["id", "provider", "lastSyncAt", "toursCount", "status", "nextPage", "totalPages", "runStartedAt"],
      [[p.newId(), "freetour", p.now, seen, "completed", totalPages + 1, totalPages, p.startedAt]],
      ["provider"],
      ["lastSyncAt", "toursCount", "status", "nextPage", "totalPages", "runStartedAt"]
    )
  );
  return stmts;
}
