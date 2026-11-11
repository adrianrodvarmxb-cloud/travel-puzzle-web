// REQ-1517: la migración de la búsqueda por raíz pasa de propuesta a migrations/ (previa a REQ-1312, SEARCH_STEM_ENABLED).
// npx vitest run src/search/migration-0025.test.ts
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

const SQL = readFileSync("migrations/0025_tour_search_stem.sql", "utf8");
const smoke = JSON.parse(readFileSync("tests/smoke/pages.json", "utf8")) as { discover: { from: string; pattern: string; take: number; required: boolean }[] };

describe("REQ-1517 migración 0025: TourSearch con la columna stem", () => {
  it("REQ-1517 vive en migrations/ con el siguiente número libre y ya no en docs/migraciones-propuestas", () => {
    expect(() => readFileSync("docs/migraciones-propuestas/0021_tour_search_stem.sql")).toThrow();
    const nums = readdirSync("migrations").filter((f) => /^\d{4}_.*\.sql$/.test(f)).map((f) => f.slice(0, 4));
    expect(nums.filter((n) => n === "0025")).toHaveLength(1);
    expect(nums.sort().at(-1)).toBe("0025");
  });
  it("REQ-1517 solo toca la tabla derivada TourSearch y la recrea con stem", () => {
    const code = SQL.replace(/--[^\n]*/g, "");
    expect(code).toMatch(/CREATE VIRTUAL TABLE IF NOT EXISTS "TourSearch" USING fts5\([\s\S]*"stem"/);
    expect([...code.matchAll(/\b(?:DROP TABLE IF EXISTS|INSERT INTO|DELETE FROM|UPDATE|ALTER TABLE)\s+"([^"]+)"/gi)].map((m) => m[1]).every((t) => t === "TourSearch")).toBe(true);
  });
  it("REQ-1517 el humo abre el buscador y exige al menos una ficha", () => {
    const r = smoke.discover.find((d) => d.from === "/tours?search=museos");
    expect(r).toBeDefined();
    expect(r!.required).toBe(true);
    expect(r!.take).toBeGreaterThanOrEqual(1);
    expect(new RegExp(r!.pattern).test("/destinos/fr/paris/visita-al-louvre")).toBe(true);
  });
});
