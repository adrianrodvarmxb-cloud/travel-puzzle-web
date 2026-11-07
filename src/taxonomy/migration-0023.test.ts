import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { sqlite } from "@/ingest/test-utils";

const SQL = readFileSync("migrations/0023_taxonomia_linaje.sql", "utf8");
const base = () => sqlite("migrations/0017_taxonomia.sql");

describe("REQ-750 migración 0023: procedencia en ExperienceTaxonomy", () => {
  // REQ-773 reemplaza el «está en docs/migraciones-propuestas» de REQ-750 (candado 4 del gate de copia exacta).
  it("REQ-773 vive en migrations/ y ya no en docs/migraciones-propuestas; va después de la 0017 y la 0022", () => {
    expect(() => readFileSync("docs/migraciones-propuestas/0023_taxonomia_linaje.sql")).toThrow();
    expect(readFileSync("migrations/0017_taxonomia.sql", "utf8")).toMatch(/"ExperienceTaxonomy"/);
    expect(readFileSync("migrations/0022_provider_record.sql", "utf8")).toMatch(/"ProviderRecord"/);
  });
  it("REQ-750 solo agrega columnas a la tabla propia", () => {
    const code = SQL.replace(/--[^\n]*/g, "");
    expect(code).not.toMatch(/\b(DROP|UPDATE|DELETE|INSERT|CREATE)\b/i);
    expect([...code.matchAll(/ALTER TABLE "([^"]+)"/g)].map((m) => m[1]).every((t) => t === "ExperienceTaxonomy")).toBe(true);
  });
  it("REQ-750 sobre la 0017 agrega origin, sourceField, sourceValue, matchedTerm y sourceRawHash; lo existente queda en NULL", () => {
    const d = base();
    d.prepare(`INSERT INTO "ExperienceTaxonomy" VALUES ('tour','t1','formato','pieza-libre','#6','v','r1','x')`).run();
    d.exec(SQL);
    const cols = (d.prepare(`PRAGMA table_info("ExperienceTaxonomy")`).all() as { name: string }[]).map((c) => c.name);
    expect(cols).toEqual(expect.arrayContaining(["origin", "sourceField", "sourceValue", "matchedTerm", "sourceRawHash"]));
    expect(d.prepare(`SELECT "origin","sourceField" FROM "ExperienceTaxonomy"`).all()).toEqual([{ origin: null, sourceField: null }]);
  });
  it("REQ-750 origin solo acepta manual, regla o proveedor", () => {
    const d = base();
    d.exec(SQL);
    expect(() => d.prepare(`INSERT INTO "ExperienceTaxonomy" ("experienceKind","experienceId","axis","term","ruleId","mappingVersion","runId","computedAt","origin") VALUES ('tour','t','tema','cultural','x','v','r','x','ia')`).run()).toThrow();
  });
});
