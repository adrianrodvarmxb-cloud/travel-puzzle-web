import { sqlValue, type Stmt } from "@/lib/d1/batch";
import type { TangolTourRow } from "./tour-rows";

/**
 * REQ-10514: lo que `tourStatements` (columnas comunes a todos los proveedores, `TOUR_FIELDS`) no escribe:
 * las columnas de la migración 0031 (REQ-10512) y `guideLanguages`. Va en un UPDATE aparte, después del
 * UPSERT de `Tour`, acotado a (proveedor, número) como todo lo de REQ-3461. Si la 0031 no está aplicada
 * la sentencia falla y el archivo .sql del sync no se aplica a medias. Puro: devuelve sentencias.
 */
export const TANGOL_EXTRA_COLUMNS = ["excludes", "cancellationPolicy", "availabilityRules", "guideLanguages"] as const;

// REQ-10514
export function tangolExtraStatements(rows: readonly Pick<TangolTourRow, "providerId" | "externalId" | (typeof TANGOL_EXTRA_COLUMNS)[number]>[]): Stmt[] {
  const set = TANGOL_EXTRA_COLUMNS.map((c) => `"${c}" = ?`).join(", ");
  return rows.map((t) => ({
    sql: `UPDATE "Tour" SET ${set} WHERE "providerId" = ? AND "externalId" = ?`,
    params: [...TANGOL_EXTRA_COLUMNS.map((c) => sqlValue(t[c])), t.providerId, t.externalId],
  }));
}
