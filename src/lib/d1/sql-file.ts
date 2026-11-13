/**
 * REQ-3464: convierte sentencias con parámetros (`Stmt`) en un archivo .sql que `wrangler d1 execute
 * --file` puede aplicar. Lo usa el workflow a mano: el ensayo NO genera archivo, y con la casilla de
 * escritura marcada el archivo queda como artefacto y se aplica en un paso aparte, a la vista del PO.
 *
 * Pura y estricta: después de `sqlValue` un parámetro solo puede ser null, número o texto. Cualquier
 * otra cosa (o un número no finito) es un error y no se escribe nada: más vale fallar que generar SQL
 * mal formado contra la base de producción.
 */
import type { Stmt } from "./batch";

/** Literal SQL de un valor ya normalizado por `sqlValue`. */
// REQ-3464
export function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`[sql-file] número no finito: ${value}`);
    return String(value);
  }
  if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
  throw new Error(`[sql-file] valor no soportado (${typeof value}); pásalo por sqlValue primero`);
}

/** Una sentencia con sus `?` ya sustituidos. Falla si sobran o faltan parámetros. */
// REQ-3464
export function inlineStatement({ sql, params }: Stmt): string {
  let i = 0;
  // Los `?` del SQL que arma este repo nunca van dentro de una cadena literal, así que basta recorrerlos.
  const texto = sql.replace(/\?/g, () => {
    if (i >= params.length) throw new Error(`[sql-file] faltan parámetros: ${sql}`);
    return sqlLiteral(params[i++]);
  });
  if (i !== params.length) throw new Error(`[sql-file] sobran ${params.length - i} parámetro(s): ${sql}`);
  return `${texto};`;
}

/** Archivo .sql completo, con un encabezado que dice de dónde salió. */
// REQ-3464
export function renderSqlFile(stmts: readonly Stmt[], header = ""): string {
  const lineas = header ? header.split("\n").map((l) => `-- ${l}`) : [];
  return [...lineas, ...stmts.map(inlineStatement), ""].join("\n");
}
