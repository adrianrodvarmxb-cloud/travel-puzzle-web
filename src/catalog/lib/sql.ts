import { upsertRows, sqlValue, MAX_PARAMS, type Stmt } from "@/lib/d1/batch";
import type { TourRow, TranslationRow } from "./tour-rows";
import type { StageKind } from "./content-hash";
import type { PresenceUpdate } from "./presence";

const TOUR_FIELDS = [
  "externalId", "providerTitle", "providerPhone", "priceValue", "priceCurrency", "duration", "durationMinutes", "titleImageURL",
  "categoryId", "rating", "reviewsNumber", "cityId", "countryId", "meetingPoint", "includes", "POIs", "images",
  "videoURL", "isActive", "lastSeenAt",
] as const;

/**
 * Sentencias para guardar una página de tours y sus traducciones en un solo batch.
 * Los tours nuevos reciben un id nuevo; los existentes conservan el suyo.
 */
export function tourStatements(
  rows: { tour: TourRow; translations: TranslationRow[] }[],
  now: Date,
  newId: () => string
): Stmt[] {
  return buildTourStatements(rows, now, newId, [], () => []);
}

/** Igual que tourStatements, más columnas extra por fila (el sync blindado agrega contentHash). */
function buildTourStatements<R extends { tour: TourRow; translations: TranslationRow[] }>(
  rows: R[],
  now: Date,
  newId: () => string,
  extraColumns: string[],
  extraValues: (row: R) => unknown[]
): Stmt[] {
  const columns = ["id", ...TOUR_FIELDS, ...extraColumns, "updatedAt", "createdAt"];
  const tourRows = rows.map((r) => [newId(), ...TOUR_FIELDS.map((f) => r.tour[f]), ...extraValues(r), now, now]);
  const update = [...TOUR_FIELDS.filter((f) => f !== "externalId"), ...extraColumns, "updatedAt"];
  const tours = upsertRows("Tour", columns, tourRows, ["externalId"], update);

  // Una sentencia por tour (6 idiomas × 7 valores = 42 parámetros).
  const translations: Stmt[] = rows
    .filter(({ translations }) => translations.length > 0)
    .map(({ tour, translations }) => ({
      sql:
        'INSERT INTO "TourTranslation" ("id", "tourId", "language", "title", "brief", "description", "url") VALUES ' +
        translations.map(() => '(?, (SELECT "id" FROM "Tour" WHERE "externalId" = ?), ?, ?, ?, ?, ?)').join(", ") +
        ' ON CONFLICT ("tourId", "language") DO UPDATE SET "title" = excluded."title", "brief" = excluded."brief",' +
        ' "description" = excluded."description", "url" = excluded."url"',
      params: translations
        .flatMap((tr) => [newId(), tour.externalId, tr.language, tr.title, tr.brief, tr.description, tr.url])
        .map(sqlValue),
    }));

  return [...tours, ...translations];
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

/** Solo calificación y reseñas: no cambia updatedAt (no es un cambio de contenido). */
// REQ-073
export function ratingStatements(rows: RatingRow[]): Stmt[] {
  return rows.map((r) => ({
    sql: 'UPDATE "Tour" SET "rating" = ?, "reviewsNumber" = ? WHERE "externalId" = ?',
    params: [r.rating, r.reviewsNumber, r.externalId].map(sqlValue),
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

/** Transiciones de presencia agrupadas por estado (máximo 100 parámetros por sentencia). */
// REQ-074
export function presenceStatements(updates: PresenceUpdate[]): Stmt[] {
  const groups = new Map<string, PresenceUpdate[]>();
  for (const u of updates) {
    const key = `${u.syncStatus}|${u.missingRuns}|${u.isActive}`;
    groups.set(key, [...(groups.get(key) ?? []), u]);
  }
  const perStmt = MAX_PARAMS - 3;
  const stmts: Stmt[] = [];
  for (const list of groups.values()) {
    const { syncStatus, missingRuns, isActive } = list[0];
    for (let i = 0; i < list.length; i += perStmt) {
      const ids = list.slice(i, i + perStmt).map((u) => u.externalId);
      stmts.push({
        sql: `UPDATE "Tour" SET "syncStatus" = ?, "missingRuns" = ?, "isActive" = ? WHERE "externalId" IN (${ids.map(() => "?").join(", ")})`,
        params: [syncStatus, missingRuns, sqlValue(isActive), ...ids],
      });
    }
  }
  return stmts;
}

/** Slug de un tour nuevo (REQ-086). Solo llena el vacío; el trigger Tour_slug_inmutable impide cambiar uno guardado. */
// REQ-086
export function slugStatements(slugs: { externalId: number; slug: string }[]): Stmt[] {
  return slugs.map((s) => ({ sql: 'UPDATE "Tour" SET "slug" = ? WHERE "externalId" = ? AND "slug" IS NULL', params: [s.slug, s.externalId] }));
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
