import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { sqlite } from "@/ingest/test-utils";

const SQL = readFileSync("docs/migraciones-propuestas/0023_taxonomia_linaje.sql", "utf8");
const base = () => sqlite("migrations/0017_taxonomia.sql");

describe("REQ-550 migración propuesta 0023: procedencia en ExperienceTaxonomy", () => {
  it("REQ-550 está en docs/migraciones-propuestas (candado) y solo agrega columnas a la tabla propia", () => {
    expect(() => readFileSync("migrations/0023_taxonomia_linaje.sql")).toThrow();
    const code = SQL.replace(/--[^\n]*/g, "");
    expect(code).not.toMatch(/\b(DROP|UPDATE|DELETE|INSERT|CREATE)\b/i);
    expect([...code.matchAll(/ALTER TABLE "([^"]+)"/g)].map((m) => m[1]).every((t) => t === "ExperienceTaxonomy")).toBe(true);
  });
  it("REQ-550 sobre la 0017 agrega origin, sourceField, sourceValue, matchedTerm y sourceRawHash; lo existente queda en NULL", () => {
    const d = base();
    d.prepare(`INSERT INTO "ExperienceTaxonomy" VALUES ('tour','t1','formato','pieza-libre','#6','v','r1','x')`).run();
    d.exec(SQL);
    const cols = (d.prepare(`PRAGMA table_info("ExperienceTaxonomy")`).all() as { name: string }[]).map((c) => c.name);
    expect(cols).toEqual(expect.arrayContaining(["origin", "sourceField", "sourceValue", "matchedTerm", "sourceRawHash"]));
    expect(d.prepare(`SELECT "origin","sourceField" FROM "ExperienceTaxonomy"`).all()).toEqual([{ origin: null, sourceField: null }]);
  });
  it("REQ-550 origin solo acepta manual, regla o proveedor", () => {
    const d = base();
    d.exec(SQL);
    expect(() => d.prepare(`INSERT INTO "ExperienceTaxonomy" ("experienceKind","experienceId","axis","term","ruleId","mappingVersion","runId","computedAt","origin") VALUES ('tour','t','tema','cultural','x','v','r','x','ia')`).run()).toThrow();
  });
});
