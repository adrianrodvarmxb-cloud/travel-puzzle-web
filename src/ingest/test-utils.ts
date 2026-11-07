/** Solo para pruebas: SQLite real (node:sqlite) con la forma del binding de D1, y las migraciones propuestas. */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

export type Sqlite = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Sqlite };

export function sqlite(...files: string[]): Sqlite {
  const d = new DatabaseSync(":memory:");
  for (const f of files) d.exec(readFileSync(f, "utf8"));
  return d;
}

export function asD1<T>(d: Sqlite): T {
  const prep = (sql: string) => ({
    bind: (...v: unknown[]) => ({ sql, v, all: async () => ({ results: d.prepare(sql).all(...v) as Record<string, unknown>[] }), run: async () => d.prepare(sql).run(...v) }),
  });
  return { prepare: prep, batch: async (stmts: unknown[]) => { for (const s of stmts as { sql: string; v: unknown[] }[]) d.prepare(s.sql).run(...s.v); } } as unknown as T;
}

export const MIGRATION_0022 = "docs/migraciones-propuestas/0022_provider_record.sql";
