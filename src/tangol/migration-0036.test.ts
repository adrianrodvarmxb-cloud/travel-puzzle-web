// REQ-10944 (ola 12, PR 2, decisión A del PO 26 nov 2026): tabla nueva "TourOption" con la tarifa pública y el traslado.
// npx vitest run src/tangol/migration-0036.test.ts
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };
const SQL = readFileSync("migrations/0036_tour_option.sql", "utf8");
const COLUMNAS = ["id", "tourId", "code", "description", "startTime", "currency", "rackAdult", "transferIncluded", "hoursBooking", "hoursCancelation", "updatedAt"];

/** Tour como está hoy (lo mínimo que la tabla nueva referencia). */
function dbAntes() {
  const d = new DatabaseSync(":memory:");
  d.exec(`PRAGMA foreign_keys = ON`);
  d.exec(`CREATE TABLE "Tour"("id" TEXT PRIMARY KEY, "externalId" INTEGER NOT NULL, "providerId" TEXT NOT NULL DEFAULT 'freetour', "includes" TEXT NOT NULL)`);
  d.prepare(`INSERT INTO "Tour" ("id", "externalId", "providerId", "includes") VALUES ('t1', 2490, 'tangol', '[]')`).run();
  return d;
}
const columnas = (d: Db) => d.prepare(`PRAGMA table_info("TourOption")`).all() as { name: string; type: string; notnull: number; pk: number }[];

describe("REQ-10944 migración 0036: tabla TourOption (opciones de Tangol con tarifa pública y traslado)", () => {
  it("REQ-10944: crea la tabla con sus 11 columnas, una fila por (tour, código) y el traslado en tres estados", () => {
    const d = dbAntes();
    d.exec(SQL);
    const cols = columnas(d);
    expect(cols.map((c) => c.name)).toEqual(COLUMNAS);
    const tipo = (n: string) => cols.find((c) => c.name === n)?.type;
    expect(tipo("rackAdult")).toBe("REAL");
    expect(tipo("transferIncluded")).toBe("INTEGER");
    expect(cols.filter((c) => c.notnull || c.pk).map((c) => c.name)).toEqual(["id", "tourId", "code", "updatedAt"]);
    const ins = d.prepare(`INSERT INTO "TourOption" ("id", "tourId", "code", "description", "startTime", "currency", "rackAdult", "transferIncluded", "hoursBooking", "hoursCancelation", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    ins.run("t1:A", "t1", "A", "Con traslado", "08:00", "USD", 52, 1, 24, 48, "2026-11-26T21:00:00Z");
    ins.run("t1:B", "t1", "B", "Sin traslado", "08:00", "USD", 40, 0, 24, 48, "2026-11-26T21:00:00Z");
    ins.run("t1:C", "t1", "C", null, null, null, null, null, null, null, "2026-11-26T21:00:00Z");
    // La misma opción dos veces no entra: (tourId, code) es única.
    expect(() => ins.run("t1:A2", "t1", "A", null, null, null, null, null, null, null, "x")).toThrow(/UNIQUE/);
    // Una opción de un tour que no existe no entra.
    expect(() => ins.run("t9:A", "t9", "A", null, null, null, null, null, null, null, "x")).toThrow(/FOREIGN KEY/);
    const filas = d.prepare(`SELECT "code", "rackAdult", "transferIncluded" FROM "TourOption" WHERE "tourId" = 't1' ORDER BY "code"`).all();
    expect(filas).toEqual([
      { code: "A", rackAdult: 52, transferIncluded: 1 },
      { code: "B", rackAdult: 40, transferIncluded: 0 },
      { code: "C", rackAdult: null, transferIncluded: null },
    ]);
  });

  it("REQ-10944: si se borra el tour se van sus opciones; no toca Tour ni otras tablas", () => {
    const d = dbAntes();
    d.exec(SQL);
    d.prepare(`INSERT INTO "TourOption" ("id", "tourId", "code", "updatedAt") VALUES ('t1:A', 't1', 'A', 'x')`).run();
    d.prepare(`DELETE FROM "Tour" WHERE "id" = 't1'`).run();
    expect((d.prepare(`SELECT COUNT(*) AS n FROM "TourOption"`).all() as { n: number }[])[0].n).toBe(0);
    const code = SQL.replace(/--[^\n]*/g, "");
    // Sentencias que escriben o destruyen (la cláusula ON DELETE CASCADE de la llave foránea no cuenta).
    expect(code).not.toMatch(/^\s*(UPDATE|DELETE|INSERT|DROP|ALTER)\b/im);
    expect(code.match(/CREATE TABLE/g)).toHaveLength(1);
    expect(code).toMatch(/CREATE UNIQUE INDEX "TourOption_tourId_code_key"/);
  });

  it("REQ-10944 / REQ-1543: solo la tarifa pública: ninguna columna de neto, utilidad ni comisión; plan de regreso escrito", () => {
    const code = SQL.replace(/--[^\n]*/g, "");
    expect(code).not.toMatch(/net|utilidad|comision|commission|margin|markup/i);
    expect(SQL).toMatch(/Plan de regreso/i);
    expect(SQL).toContain(`DROP TABLE "TourOption"`);
    expect(SQL).toMatch(/NO se declaran en prisma/i);
  });

  it("REQ-10944: ningún otro archivo usa el número 0036 y la tabla NO está declarada en Prisma", () => {
    expect(readdirSync("migrations").filter((f) => f.startsWith("0036_"))).toEqual(["0036_tour_option.sql"]);
    const prisma = readFileSync("prisma/schema.prisma", "utf8");
    expect(prisma).not.toMatch(/model TourOption\b/);
  });
});
