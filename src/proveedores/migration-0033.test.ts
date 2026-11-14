import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { leerPreguntas } from "./lib/preguntas";

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };
const SQL = readFileSync("migrations/0033_proveedor_preguntas.sql", "utf8");

/** Proveedor como queda tras la 0027 (lo mínimo que toca la migración). */
function dbAntes() {
  const d = new DatabaseSync(":memory:");
  d.exec(`CREATE TABLE "Proveedor"("id" TEXT PRIMARY KEY, "nombre" TEXT NOT NULL, "idioma" TEXT NOT NULL DEFAULT 'es', "correos" TEXT NOT NULL DEFAULT '[]')`);
  d.prepare(`INSERT INTO "Proveedor" ("id", "nombre") VALUES ('jordan-experience', 'Jordan Experience')`).run();
  return d;
}

describe("REQ-10649 migración 0033: preguntas abiertas por proveedor", () => {
  it("REQ-10649: agrega la columna preguntas (TEXT, '[]') y las filas que ya existen quedan sin preguntas", () => {
    const d = dbAntes();
    d.exec(SQL);
    const cols = d.prepare(`PRAGMA table_info("Proveedor")`).all() as { name: string; type: string; dflt_value: string }[];
    const col = cols.find((c) => c.name === "preguntas");
    expect(col?.type).toBe("TEXT");
    const fila = d.prepare(`SELECT "preguntas" FROM "Proveedor" WHERE "id" = 'jordan-experience'`).all()[0] as { preguntas: string };
    expect(fila.preguntas).toBe("[]");
    expect(leerPreguntas(fila.preguntas)).toEqual([]);
  });

  it("REQ-10649: solo agrega una columna; no toca filas ni otras tablas, y se puede volver a correr sin perder datos", () => {
    const d = dbAntes();
    d.exec(SQL);
    expect((d.prepare(`SELECT COUNT(*) AS n FROM "Proveedor"`).all() as { n: number }[])[0].n).toBe(1);
    const code = SQL.replace(/--[^\n]*/g, "");
    expect(code).not.toMatch(/\b(UPDATE|DELETE|INSERT|DROP|CREATE)\b/i);
    expect(code.match(/ALTER TABLE/g)).toHaveLength(1);
  });
});
