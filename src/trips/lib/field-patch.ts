/**
 * REQ-10726: corrección puntual de campos de viajes ya cargados, a partir del mismo archivo de imports/. Puro.
 * A diferencia de la carga completa (bulk-import), solo escribe los campos pedidos de una lista cerrada:
 * no toca estado, código, slug, fotos, taxonomía ni dificultad. El id sale de la referencia del operador (idFor).
 */
import { idFor } from "./bulk-import";

/** Campos que se pueden corregir así. Lista cerrada: agregar uno es una decisión, no un parámetro libre. */
export const PATCHABLE_FIELDS = ["minPax", "importantInfo"] as const;
export type PatchableField = (typeof PATCHABLE_FIELDS)[number];

export interface PatchRow { ref: string; trip: Record<string, unknown> }
export interface PatchResult { sql: string[]; ids: string[] }

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
};

// REQ-10726
export function buildFieldPatchSql(rows: PatchRow[], initials: string, fields: readonly string[], agencyId: string): PatchResult {
  const bad = fields.filter((f) => !(PATCHABLE_FIELDS as readonly string[]).includes(f));
  if (bad.length) throw new Error(`Campo no permitido: ${bad.join(", ")}. Permitidos: ${PATCHABLE_FIELDS.join(", ")}`);
  if (!fields.length) throw new Error("Falta al menos un campo");
  const sql: string[] = [];
  const ids: string[] = [];
  for (const row of rows) {
    for (const f of fields) if (!(f in row.trip)) throw new Error(`${row.ref}: el archivo no trae «${f}»`);
    const id = idFor(initials, row.ref);
    ids.push(id);
    const set = fields.map((f) => `"${f}"=${q(row.trip[f])}`).join(",");
    sql.push(`UPDATE "Trip" SET ${set} WHERE "id"=${q(id)} AND "agencyId"=${q(agencyId)};`);
  }
  return { sql, ids };
}
