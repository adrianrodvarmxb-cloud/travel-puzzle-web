import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };
const SQL = readFileSync("migrations/0017_taxonomia.sql", "utf8");

function db() {
  const d = new DatabaseSync(":memory:");
  d.exec(`CREATE TABLE "Tour"("id" TEXT PRIMARY KEY, "externalId" INTEGER, "categoryId" INTEGER, "contentHash" TEXT)`);
  d.exec(`INSERT INTO "Tour" VALUES ('t1', 1, 12, 'h1')`);
  d.exec(SQL);
  return d;
}
const row = (over: Record<string, string> = {}) => ({ k: "tour", id: "t1", axis: "formato", term: "pieza-libre", rule: "#6", v: "2026-11-06", run: "r1", at: "2026-11-06T00:00:00Z", ...over });
const insert = (d: Db, r = row()) =>
  d.prepare(`INSERT INTO "ExperienceTaxonomy" VALUES (?,?,?,?,?,?,?,?)`).run(r.k, r.id, r.axis, r.term, r.rule, r.v, r.run, r.at);

describe("REQ-409 migración 0017: tablas propias de la taxonomía", () => {
  it("REQ-409 solo crea tablas e índices; no hay ALTER, DROP, UPDATE ni DELETE ni toca Tour, TourTranslation o Trip", () => {
    const code = SQL.replace(/--[^\n]*/g, "");
    expect(code).not.toMatch(/\b(ALTER|DROP|UPDATE|DELETE|INSERT)\b/i);
    expect(code).not.toMatch(/"(Tour|TourTranslation|Trip)"/);
    const tables = (db().prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all() as { name: string }[]).map((t) => t.name);
    expect(tables).toEqual(["ExperienceTaxonomy", "ExperienceTaxonomyOverride", "TaxonomyRun", "Tour"]);
  });
  it("REQ-409 se puede aplicar dos veces sin error (IF NOT EXISTS) y no cambia los datos del proveedor", () => {
    const d = db();
    d.exec(SQL);
    expect(d.prepare(`SELECT * FROM "Tour"`).all()).toEqual([{ id: "t1", externalId: 1, categoryId: 12, contentHash: "h1" }]);
  });
  it("REQ-409 una experiencia tiene cada término una vez por corrida; otra corrida puede volver a escribirlo", () => {
    const d = db();
    insert(d);
    expect(() => insert(d)).toThrow();
    insert(d, row({ run: "r2" }));
    expect(d.prepare(`SELECT COUNT(*) AS n FROM "ExperienceTaxonomy"`).all()).toEqual([{ n: 2 }]);
  });
  it("REQ-409 rechaza tipos de experiencia, ejes, acciones y estados que no existen", () => {
    const d = db();
    expect(() => insert(d, row({ k: "hotel" }))).toThrow();
    expect(() => insert(d, row({ axis: "categoria" }))).toThrow();
    expect(() => d.prepare(`INSERT INTO "ExperienceTaxonomyOverride" ("experienceKind","experienceId","axis","term","action","by","at") VALUES ('tour','t1','tema','cultural','borrar','po','x')`).run()).toThrow();
    expect(() => d.prepare(`INSERT INTO "TaxonomyRun" ("id","startedAt","mappingVersion","status") VALUES ('r1','x','v','listo')`).run()).toThrow();
  });
  it("REQ-408 la corrida guarda las categorías sin mapear (log de por-revisar) con valores por omisión", () => {
    const d = db();
    d.prepare(`INSERT INTO "TaxonomyRun" ("id","startedAt","mappingVersion") VALUES ('r1','2026-11-06T00:00:00Z','2026-11-06')`).run();
    expect(d.prepare(`SELECT "counts","unmapped","unclassified","status","cursor","tripsDone" FROM "TaxonomyRun"`).all()).toEqual([{ counts: "{}", unmapped: "[]", unclassified: 0, status: "running", cursor: "", tripsDone: 0 }]);
  });
});
