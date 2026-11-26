// REQ-10944 (ola 12, PR 2, decisión A): sentencias de TourOption, probadas contra la migración 0036 en SQLite.
// npx vitest run src/tangol/lib/option-sql.test.ts
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { tourOptionStatements } from "./option-sql";
import type { TourOptionRow } from "./option-rows";

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };

const ahora = new Date("2026-11-26T21:00:00Z");
const con: TourOptionRow = { code: "CT", description: "Con traslado", startTime: "08:00", currency: "USD", rackAdult: 52, transferIncluded: true, hoursBooking: 24, hoursCancelation: 48 };
const sin: TourOptionRow = { code: "ST", description: "Sin traslado", startTime: "08:30", currency: "USD", rackAdult: 40, transferIncluded: false, hoursBooking: 24, hoursCancelation: 48 };
const nada: TourOptionRow = { code: "XX", description: null, startTime: null, currency: null, rackAdult: null, transferIncluded: null, hoursBooking: null, hoursCancelation: null };

function db() {
  const d = new DatabaseSync(":memory:");
  d.exec(`PRAGMA foreign_keys = ON`);
  d.exec(`CREATE TABLE "Tour"("id" TEXT PRIMARY KEY, "externalId" INTEGER NOT NULL, "providerId" TEXT NOT NULL DEFAULT 'freetour', "includes" TEXT NOT NULL)`);
  d.exec(readFileSync("migrations/0036_tour_option.sql", "utf8"));
  d.prepare(`INSERT INTO "Tour" ("id", "externalId", "providerId", "includes") VALUES ('t-tangol', 2490, 'tangol', '[]'), ('t-free', 2490, 'freetour', '[]')`).run();
  return d;
}
const aplicar = (d: Db, stmts: ReturnType<typeof tourOptionStatements>) => { for (const s of stmts) d.prepare(s.sql).run(...(s.params as unknown[])); };
const filas = (d: Db) => d.prepare(`SELECT "id", "tourId", "code", "rackAdult", "transferIncluded", "currency", "updatedAt" FROM "TourOption" ORDER BY "code"`).all();

describe("REQ-10944: sentencias de TourOption acotadas a (proveedor, número)", () => {
  it("REQ-10944: escribe una fila por opción con el id «tourId:code», resuelve el tour por (proveedor, número) y no toca el de Freetour", () => {
    const d = db();
    const stmts = tourOptionStatements([{ providerId: "tangol", externalId: 2490, options: [con, sin, nada] }], ahora);
    expect(stmts).toHaveLength(4); // 1 DELETE + 3 INSERT
    expect(stmts[0].sql).toBe(`DELETE FROM "TourOption" WHERE "tourId" IN (SELECT "id" FROM "Tour" WHERE "providerId" = ? AND "externalId" = ?) AND "code" NOT IN (?, ?, ?)`);
    expect(stmts[0].params).toEqual(["tangol", 2490, "CT", "ST", "XX"]);
    aplicar(d, stmts);
    expect(filas(d)).toEqual([
      { id: "t-tangol:CT", tourId: "t-tangol", code: "CT", rackAdult: 52, transferIncluded: 1, currency: "USD", updatedAt: "2026-11-26T21:00:00.000+00:00" },
      { id: "t-tangol:ST", tourId: "t-tangol", code: "ST", rackAdult: 40, transferIncluded: 0, currency: "USD", updatedAt: "2026-11-26T21:00:00.000+00:00" },
      { id: "t-tangol:XX", tourId: "t-tangol", code: "XX", rackAdult: null, transferIncluded: null, currency: null, updatedAt: "2026-11-26T21:00:00.000+00:00" },
    ]);
  });

  it("REQ-10944: la segunda corrida actualiza la tarifa de la misma opción y quita las que Tangol ya no manda; sin opciones, se van todas", () => {
    const d = db();
    aplicar(d, tourOptionStatements([{ providerId: "tangol", externalId: 2490, options: [con, sin, nada] }], ahora));
    const despues = new Date("2026-11-27T21:00:00Z");
    aplicar(d, tourOptionStatements([{ providerId: "tangol", externalId: 2490, options: [{ ...con, rackAdult: 55, description: "Con traslado (nuevo)" }] }], despues));
    expect(filas(d)).toEqual([{ id: "t-tangol:CT", tourId: "t-tangol", code: "CT", rackAdult: 55, transferIncluded: 1, currency: "USD", updatedAt: "2026-11-27T21:00:00.000+00:00" }]);
    const vacio = tourOptionStatements([{ providerId: "tangol", externalId: 2490, options: [] }], despues);
    expect(vacio).toHaveLength(1);
    expect(vacio[0].sql).not.toContain("NOT IN");
    aplicar(d, vacio);
    expect(filas(d)).toEqual([]);
  });

  it("REQ-10944: un tour que no existe no deja filas (la sentencia escribe cero filas, sin error); sin filas, sin sentencias", () => {
    const d = db();
    aplicar(d, tourOptionStatements([{ providerId: "tangol", externalId: 999, options: [con] }], ahora));
    expect(filas(d)).toEqual([]);
    expect(tourOptionStatements([], ahora)).toEqual([]);
  });
});
