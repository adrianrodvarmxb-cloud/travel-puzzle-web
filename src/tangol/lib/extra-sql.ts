import { sqlValue, type Stmt } from "@/lib/d1/batch";
import type { TangolTourRow } from "./tour-rows";

/**
 * REQ-10514: lo que `tourStatements` (columnas comunes a todos los proveedores, `TOUR_FIELDS`) no escribe:
 * las columnas de la migración 0031 (REQ-10512) y `guideLanguages`. Va en un UPDATE aparte, después del
 * UPSERT de `Tour`, acotado a (proveedor, número) como todo lo de REQ-3461. Si la 0031 no está aplicada
 * la sentencia falla y el archivo .sql del sync no se aplica a medias. Puro: devuelve sentencias.
 */
// REQ-10537 / REQ-10538: más las 9 columnas de la migración 0032 (una por dato, gate A). Si la 0032 no está aplicada
// la sentencia falla y el archivo .sql del sync no se aplica a medias (mismo criterio que con la 0031).
export const TANGOL_EXTRA_COLUMNS = [
  "excludes", "cancellationPolicy", "availabilityRules", "guideLanguages",
  "endPoint", "whatToBring", "physicalRequirements", "difficulty", "providerNotes", "childAgeFrom", "childAgeTo", "infantAgeFrom", "infantAgeTo",
] as const;

/** REQ-10537: textos largos del proveedor que se sueltan (NULL) si la sentencia aun sin reglas no cabe. */
const TEXTOS_LARGOS = ["whatToBring", "physicalRequirements", "providerNotes", "cancellationPolicy", "difficulty"] as const;

// REQ-10514, REQ-10537, REQ-10538
export function tangolExtraStatements(rows: readonly Pick<TangolTourRow, "providerId" | "externalId" | (typeof TANGOL_EXTRA_COLUMNS)[number]>[]): Stmt[] {
  const set = TANGOL_EXTRA_COLUMNS.map((c) => `"${c}" = ?`).join(", ");
  return rows.map((t) => ({
    sql: `UPDATE "Tour" SET ${set} WHERE "providerId" = ? AND "externalId" = ?`,
    params: [...TANGOL_EXTRA_COLUMNS.map((c) => sqlValue(t[c])), t.providerId, t.externalId],
  }));
}

/**
 * REQ-10525: D1 rechaza una sentencia de más de 100 KB (SQLITE_TOOBIG) y con `--file` eso tumba el archivo
 * entero. Si las reglas de disponibilidad de un tour no caben ni compactadas (REQ-10525 en rates.ts), ese
 * campo se escribe como NULL (la ficha lo trata como "sin reglas", igual que antes de la 0031) y el número
 * del tour se devuelve para reportarlo; lo demás del tour sí se escribe. Para filas normales devuelve
 * exactamente lo mismo que `tangolExtraStatements`.
 */
export const MAX_STMT_BYTES = 90_000;

// REQ-10525, REQ-10537
export function tangolExtraStatementsAcotadas(
  rows: readonly Pick<TangolTourRow, "providerId" | "externalId" | (typeof TANGOL_EXTRA_COLUMNS)[number]>[]
): { stmts: Stmt[]; recortados: number[] } {
  const recortados: number[] = [];
  const bytes = (s: Stmt) => s.sql.length + s.params.reduce<number>((n, p) => n + String(p ?? "").length, 0);
  const stmts = rows.map((t) => {
    const [stmt] = tangolExtraStatements([t]);
    if (bytes(stmt) < MAX_STMT_BYTES) return stmt;
    recortados.push(t.externalId);
    const sinReglas = { ...t, availabilityRules: null };
    const [segundo] = tangolExtraStatements([sinReglas]);
    if (bytes(segundo) < MAX_STMT_BYTES) return segundo;
    // REQ-10537: textos del proveedor enormes; se escriben en NULL (la ficha oculta ese bloque) y lo demás sí se escribe.
    return tangolExtraStatements([{ ...sinReglas, ...Object.fromEntries(TEXTOS_LARGOS.map((c) => [c, null])) }])[0];
  });
  return { stmts, recortados };
}
