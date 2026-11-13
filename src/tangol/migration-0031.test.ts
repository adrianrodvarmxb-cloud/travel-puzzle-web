import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };
const SQL = readFileSync("migrations/0031_tour_detalle_proveedor.sql", "utf8");

/** Tour como está hoy (lo mínimo que toca la migración). */
function dbAntes() {
  const d = new DatabaseSync(":memory:");
  d.exec(`CREATE TABLE "Tour"("id" TEXT PRIMARY KEY, "externalId" INTEGER NOT NULL, "providerId" TEXT NOT NULL DEFAULT 'freetour', "includes" TEXT NOT NULL, "guideLanguages" TEXT NOT NULL DEFAULT '[]')`);
  d.exec(`CREATE UNIQUE INDEX "Tour_providerId_externalId_key" ON "Tour"("providerId", "externalId")`);
  d.prepare(`INSERT INTO "Tour" ("id", "externalId", "providerId", "includes") VALUES ('a', 1234, 'freetour', '["Guía"]')`).run();
  return d;
}
const columnas = (d: Db) => (d.prepare(`PRAGMA table_info("Tour")`).all() as { name: string }[]).map((c) => c.name);

describe("REQ-10512 migración 0031: columnas de Tour para el detalle del proveedor", () => {
  it("REQ-10512: agrega excludes, cancellationPolicy y availabilityRules, en NULL para las filas que ya existen", () => {
    const d = dbAntes();
    d.exec(SQL);
    expect(columnas(d)).toEqual(expect.arrayContaining(["excludes", "cancellationPolicy", "availabilityRules"]));
    const fila = d.prepare(`SELECT "includes", "excludes", "cancellationPolicy", "availabilityRules" FROM "Tour" WHERE "id" = 'a'`).all()[0] as Record<string, unknown>;
    expect(fila).toEqual({ includes: '["Guía"]', excludes: null, cancellationPolicy: null, availabilityRules: null });
  });

  it("REQ-10512: solo agrega columnas; no toca filas, índices ni otras tablas, y trae el plan de regreso", () => {
    const d = dbAntes();
    d.exec(SQL);
    expect((d.prepare(`SELECT COUNT(*) AS n FROM "Tour"`).all() as { n: number }[])[0].n).toBe(1);
    const code = SQL.replace(/--[^\n]*/g, "");
    expect(code).not.toMatch(/\b(UPDATE|DELETE|INSERT|DROP|CREATE)\b/i);
    expect(code.match(/ALTER TABLE "Tour" ADD COLUMN/g)).toHaveLength(3);
    expect(SQL).toMatch(/Plan de regreso/i);
    expect(SQL).toMatch(/NO se declaran en prisma/i);
  });

  it("REQ-10512: ningún otro archivo usa el número 0031 y las columnas NO están declaradas en Prisma", () => {
    expect(readdirSync("migrations").filter((f) => f.startsWith("0031_"))).toEqual(["0031_tour_detalle_proveedor.sql"]);
    const prisma = readFileSync("prisma/schema.prisma", "utf8");
    const modeloTour = /model Tour \{[\s\S]*?\n\}/.exec(prisma)?.[0] ?? "";
    expect(modeloTour).toContain("includes");
    expect(modeloTour).not.toMatch(/^\s*(excludes|cancellationPolicy|availabilityRules)\s+/m);
  });
});
