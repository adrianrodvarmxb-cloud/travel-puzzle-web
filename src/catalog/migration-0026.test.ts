import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };
const SQL = readFileSync("migrations/0026_tour_externalid_por_proveedor.sql", "utf8");

/** Tour como quedó tras 0001 (índice viejo) y 0015 (índice compuesto). */
function dbAntes() {
  const d = new DatabaseSync(":memory:");
  d.exec(`CREATE TABLE "Tour"("id" TEXT PRIMARY KEY, "externalId" INTEGER NOT NULL, "providerId" TEXT NOT NULL DEFAULT 'freetour', "providerTitle" TEXT)`);
  d.exec(`CREATE UNIQUE INDEX "Tour_externalId_key" ON "Tour"("externalId")`);
  d.exec(`CREATE UNIQUE INDEX "Tour_providerId_externalId_key" ON "Tour"("providerId", "externalId")`);
  d.prepare(`INSERT INTO "Tour" VALUES ('a', 1234, 'freetour', 'Free tour Madrid')`).run();
  return d;
}
const indices = (d: Db) => (d.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='Tour' AND name LIKE 'Tour_%' ORDER BY name`).all() as { name: string }[]).map((x) => x.name);

describe("REQ-1623 migración 0026: externalId único por proveedor, no en toda la tabla", () => {
  it("REQ-1623: antes, un tour de Tangol con el mismo número que uno de Freetour NO se puede insertar", () => {
    const d = dbAntes();
    expect(() => d.prepare(`INSERT INTO "Tour" VALUES ('b', 1234, 'tangol', 'City tour Buenos Aires')`).run()).toThrow(/UNIQUE/);
  });

  it("REQ-1623: después, sí se inserta; y el mismo (proveedor, número) sigue siendo único", () => {
    const d = dbAntes();
    d.exec(SQL);
    d.prepare(`INSERT INTO "Tour" VALUES ('b', 1234, 'tangol', 'City tour Buenos Aires')`).run();
    expect((d.prepare(`SELECT COUNT(*) AS n FROM "Tour" WHERE "externalId" = 1234`).all() as { n: number }[])[0].n).toBe(2);
    expect(() => d.prepare(`INSERT INTO "Tour" VALUES ('c', 1234, 'tangol', 'duplicado')`).run()).toThrow(/UNIQUE/);
  });

  it("REQ-1623: solo quita el índice viejo; conserva el compuesto y no toca filas ni otras tablas", () => {
    const d = dbAntes();
    d.exec(SQL);
    expect(indices(d)).toEqual(["Tour_providerId_externalId_key"]);
    expect((d.prepare(`SELECT COUNT(*) AS n FROM "Tour"`).all() as { n: number }[])[0].n).toBe(1);
    const code = SQL.replace(/--[^\n]*/g, "");
    expect(code).not.toMatch(/\b(ALTER|UPDATE|DELETE|INSERT|CREATE TABLE)\b/i);
    expect(code).toMatch(/DROP INDEX IF EXISTS "Tour_externalId_key"/);
  });

  it("REQ-1623: es idempotente (se puede volver a correr) y trae el plan de regreso", () => {
    const d = dbAntes();
    d.exec(SQL);
    expect(() => d.exec(SQL)).not.toThrow();
    expect(SQL).toMatch(/Plan de regreso/i);
  });
});
