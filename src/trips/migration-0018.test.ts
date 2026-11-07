import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };
const SQL = readFileSync("migrations/0018_trip_facetas.sql", "utf8");

function db() {
  const d = new DatabaseSync(":memory:");
  d.exec(`CREATE TABLE "Trip"("id" TEXT PRIMARY KEY, "kind" TEXT, "difficulty" TEXT, "accessibility" TEXT NOT NULL DEFAULT '')`);
  d.exec(`INSERT INTO "Trip" VALUES ('t1','circuito','moderada','Rampa en el hotel')`);
  d.exec(SQL);
  return d;
}
const cols = (d: Db) => (d.prepare(`PRAGMA table_info("Trip")`).all() as { name: string }[]).map((c) => c.name);

describe("REQ-425 migración 0018: facetas de circuitos en Trip", () => {
  it("REQ-425 solo agrega columnas; no borra ni cambia «difficulty» ni «accessibility» ni los datos", () => {
    const code = SQL.replace(/--[^\n]*/g, "");
    expect(code).not.toMatch(/\b(DROP|UPDATE|DELETE|INSERT|RENAME)\b/i);
    expect((code.match(/ALTER TABLE "Trip" ADD COLUMN/g) ?? []).length).toBe(5);
    const d = db();
    expect(cols(d)).toEqual(["id", "kind", "difficulty", "accessibility", "difficultyLevel", "comfort", "guideType", "travelerProfiles", "accessible"]);
    expect(d.prepare(`SELECT * FROM "Trip"`).all()[0]).toEqual({ id: "t1", kind: "circuito", difficulty: "moderada", accessibility: "Rampa en el hotel", difficultyLevel: null, comfort: null, guideType: null, travelerProfiles: "[]", accessible: null });
  });
  it("REQ-425 sin dato = NULL; los valores fuera de la escala o de las listas se rechazan", () => {
    const d = db();
    expect(() => d.prepare(`UPDATE "Trip" SET "difficultyLevel"=6`).run()).toThrow();
    expect(() => d.prepare(`UPDATE "Trip" SET "comfort"='lujo'`).run()).toThrow();
    expect(() => d.prepare(`UPDATE "Trip" SET "guideType"='libre'`).run()).toThrow();
    d.prepare(`UPDATE "Trip" SET "difficultyLevel"=3, "comfort"='confort', "guideType"='guiado'`).run();
    expect(d.prepare(`SELECT "difficultyLevel","comfort","guideType" FROM "Trip"`).all()[0]).toEqual({ difficultyLevel: 3, comfort: "confort", guideType: "guiado" });
  });
});
