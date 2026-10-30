/**
 * Guardado en lote directo a Cloudflare D1.
 *
 * Prisma sobre D1 no tiene transacciones reales y corta a los 5 segundos los
 * lotes grandes ($transaction). Aquí se arman sentencias UPSERT simples y se
 * mandan en una sola llamada `batch` (una ida y vuelta, atómica en D1).
 * Los valores se guardan en el mismo formato que usa Prisma para leerlos.
 */

/** D1 acepta como máximo 100 parámetros por sentencia. */
export const MAX_PARAMS = 100;

export interface Stmt {
  sql: string;
  params: unknown[];
}

/** Lo mínimo que se usa del binding de D1. */
export interface D1Like {
  prepare(sql: string): { bind(...values: unknown[]): unknown };
  batch(statements: unknown[]): Promise<unknown>;
}

/** Fecha como la escribe Prisma en D1: ISO con "+00:00". */
export function sqlDate(date: Date): string {
  return date.toISOString().replace("Z", "+00:00");
}

/** Convierte un valor de JS al formato que guarda Prisma. */
export function sqlValue(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return sqlDate(value);
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

const q = (name: string) => `"${name}"`;

/**
 * INSERT ... ON CONFLICT DO UPDATE para varias filas, partido en sentencias
 * de máximo 100 parámetros.
 */
export function upsertRows(
  table: string,
  columns: string[],
  rows: unknown[][],
  conflict: string[],
  update: string[]
): Stmt[] {
  if (rows.length === 0) return [];
  const perStmt = Math.max(1, Math.floor(MAX_PARAMS / columns.length));
  const rowSql = `(${columns.map(() => "?").join(", ")})`;
  const head = `INSERT INTO ${q(table)} (${columns.map(q).join(", ")}) VALUES `;
  const tail =
    ` ON CONFLICT (${conflict.map(q).join(", ")}) DO ` +
    (update.length ? `UPDATE SET ${update.map((c) => `${q(c)} = excluded.${q(c)}`).join(", ")}` : "NOTHING");

  const stmts: Stmt[] = [];
  for (let i = 0; i < rows.length; i += perStmt) {
    const chunk = rows.slice(i, i + perStmt);
    stmts.push({ sql: head + chunk.map(() => rowSql).join(", ") + tail, params: chunk.flat().map(sqlValue) });
  }
  return stmts;
}

/** Ejecuta las sentencias en una sola llamada batch. */
export async function runBatch(db: D1Like, stmts: Stmt[]): Promise<void> {
  if (stmts.length === 0) return;
  await db.batch(stmts.map((s) => db.prepare(s.sql).bind(...s.params)));
}
