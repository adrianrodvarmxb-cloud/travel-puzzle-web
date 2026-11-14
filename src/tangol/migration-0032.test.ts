import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };
const SQL_0031 = readFileSync("migrations/0031_tour_detalle_proveedor.sql", "utf8");
const SQL = readFileSync("migrations/0032_tour_info_practica.sql", "utf8");
const NUEVAS = ["endPoint", "whatToBring", "physicalRequirements", "difficulty", "providerNotes", "childAgeFrom", "childAgeTo", "infantAgeFrom", "infantAgeTo"];

/** Tour como queda tras la 0031 (lo mínimo que toca la migración). */
function dbAntes() {
  const d = new DatabaseSync(":memory:");
  d.exec(`CREATE TABLE "Tour"("id" TEXT PRIMARY KEY, "externalId" INTEGER NOT NULL, "providerId" TEXT NOT NULL DEFAULT 'freetour', "includes" TEXT NOT NULL, "guideLanguages" TEXT NOT NULL DEFAULT '[]')`);
  d.exec(`CREATE UNIQUE INDEX "Tour_providerId_externalId_key" ON "Tour"("providerId", "externalId")`);
  d.exec(SQL_0031);
  d.prepare(`INSERT INTO "Tour" ("id", "externalId", "providerId", "includes") VALUES ('a', 1234, 'freetour', '["Guía"]')`).run();
  return d;
}
const columnas = (d: Db) => (d.prepare(`PRAGMA table_info("Tour")`).all() as { name: string; type: string }[]);

describe("REQ-10537 / REQ-10538 migración 0032: una columna por dato (gate A)", () => {
  it("REQ-10537: agrega las 9 columnas (5 TEXT y 4 INTEGER), en NULL para las filas que ya existen", () => {
    const d = dbAntes();
    d.exec(SQL);
    const cols = columnas(d);
    for (const c of NUEVAS) expect(cols.map((x) => x.name)).toContain(c);
    const tipo = (n: string) => cols.find((c) => c.name === n)?.type;
    for (const c of ["endPoint", "whatToBring", "physicalRequirements", "difficulty", "providerNotes"]) expect(tipo(c)).toBe("TEXT");
    for (const c of ["childAgeFrom", "childAgeTo", "infantAgeFrom", "infantAgeTo"]) expect(tipo(c)).toBe("INTEGER");
    const fila = d.prepare(`SELECT ${NUEVAS.map((c) => `"${c}"`).join(", ")}, "includes" FROM "Tour" WHERE "id" = 'a'`).all()[0] as Record<string, unknown>;
    expect(fila).toEqual({ ...Object.fromEntries(NUEVAS.map((c) => [c, null])), includes: '["Guía"]' });
  });

  it("REQ-10538: solo agrega columnas; no toca filas, índices ni otras tablas, y trae el plan de regreso", () => {
    const d = dbAntes();
    d.exec(SQL);
    expect((d.prepare(`SELECT COUNT(*) AS n FROM "Tour"`).all() as { n: number }[])[0].n).toBe(1);
    const code = SQL.replace(/--[^\n]*/g, "");
    expect(code).not.toMatch(/\b(UPDATE|DELETE|INSERT|DROP|CREATE)\b/i);
    expect(code.match(/ALTER TABLE "Tour" ADD COLUMN/g)).toHaveLength(9);
    expect(SQL).toMatch(/Plan de regreso/i);
    for (const c of NUEVAS) expect(SQL).toContain(`DROP COLUMN "${c}"`);
    expect(SQL).toMatch(/NO se declaran en prisma/i);
  });

  it("REQ-10537: ningún otro archivo usa el número 0032 y las columnas NO están declaradas en Prisma", () => {
    expect(readdirSync("migrations").filter((f) => f.startsWith("0032_"))).toEqual(["0032_tour_info_practica.sql"]);
    const prisma = readFileSync("prisma/schema.prisma", "utf8");
    const modeloTour = /model Tour \{[\s\S]*?\n\}/.exec(prisma)?.[0] ?? "";
    expect(modeloTour).toContain("includes");
    for (const c of NUEVAS) expect(modeloTour).not.toMatch(new RegExp(`^\\s*${c}\\s+`, "m"));
  });
});
