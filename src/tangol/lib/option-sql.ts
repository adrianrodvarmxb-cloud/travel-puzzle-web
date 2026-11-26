/**
 * REQ-10944 · Sentencias para `TourOption` (migración 0036): por tour, se quitan las opciones que Tangol ya no manda y
 * se escribe (INSERT … ON CONFLICT DO UPDATE) una fila por opción, acotado a (proveedor, número) como todo lo de
 * REQ-3461 (el `id` del tour se resuelve en SQL: el UPSERT de `Tour` corre antes y puede crearlo en la misma corrida).
 * Solo viajan la tarifa pública y el traslado (REQ-1543). Si la 0036 no está aplicada, la sentencia falla y el archivo
 * .sql del sync no se aplica a medias: por eso el repositorio solo las junta con `TANGOL_OPTIONS_TABLE_ON=true`.
 * Puro: devuelve sentencias.
 */
import { sqlValue, type Stmt } from "@/lib/d1/batch";
import type { TourOptionRow } from "./option-rows";

export const TOUR_OPTION_COLUMNS = ["code", "description", "startTime", "currency", "rackAdult", "transferIncluded", "hoursBooking", "hoursCancelation"] as const;

const TOUR = `SELECT "id" FROM "Tour" WHERE "providerId" = ? AND "externalId" = ?`;

export interface TourOptionsOf {
  providerId: string;
  externalId: number;
  options: readonly TourOptionRow[];
}

// REQ-10944
export function tourOptionStatements(rows: readonly TourOptionsOf[], now: Date): Stmt[] {
  const stmts: Stmt[] = [];
  const at = sqlValue(now);
  for (const t of rows) {
    const codes = t.options.map((o) => o.code);
    // 1) Las opciones que ya no existen en Tangol se van (sin opciones: se van todas).
    stmts.push({
      sql: `DELETE FROM "TourOption" WHERE "tourId" IN (${TOUR})${codes.length ? ` AND "code" NOT IN (${codes.map(() => "?").join(", ")})` : ""}`,
      params: [t.providerId, t.externalId, ...codes],
    });
    // 2) Una fila por opción; la misma (tourId, code) se actualiza.
    for (const o of t.options) {
      stmts.push({
        sql:
          `INSERT INTO "TourOption" ("id", "tourId", ${TOUR_OPTION_COLUMNS.map((c) => `"${c}"`).join(", ")}, "updatedAt") ` +
          `SELECT "id" || ':' || ?, "id", ${TOUR_OPTION_COLUMNS.map(() => "?").join(", ")}, ? FROM "Tour" WHERE "providerId" = ? AND "externalId" = ? ` +
          `ON CONFLICT ("tourId", "code") DO UPDATE SET ${TOUR_OPTION_COLUMNS.filter((c) => c !== "code").map((c) => `"${c}" = excluded."${c}"`).join(", ")}, "updatedAt" = excluded."updatedAt"`,
        params: [o.code, ...TOUR_OPTION_COLUMNS.map((c) => sqlValue(o[c])), at, t.providerId, t.externalId],
      });
    }
  }
  return stmts;
}
