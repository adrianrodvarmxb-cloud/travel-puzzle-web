import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };
const SQL_0022 = readFileSync("migrations/0022_provider_record.sql", "utf8");

function db() {
  const d = new DatabaseSync(":memory:");
  d.exec(`CREATE TABLE "Tour"("id" TEXT PRIMARY KEY, "externalId" INTEGER)`);
  d.exec(SQL_0022);
  return d;
}
const ins = (d: Db, hash = "h1", key = `raw/freetour/1/${hash}.json`) =>
  d.prepare(`INSERT INTO "ProviderRecord" ("id","provider","externalId","rawHash","r2Key","bytes","fetchedAt","lastSeenAt","runId") VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(key, "freetour", "1", hash, key, 10, "2026-11-06T00:00:00Z", "2026-11-06T00:00:00Z", "r1");

describe("REQ-746 migración 0022: índice ProviderRecord del archivo crudo", () => {
  // REQ-772 reemplaza el «vive en docs/migraciones-propuestas» de REQ-746 (candado 3 del gate de copia exacta).
  it("REQ-772 vive en migrations/ (se aplica con la casilla «migraciones») y ya no en docs/migraciones-propuestas", () => {
    expect(() => readFileSync("docs/migraciones-propuestas/0022_provider_record.sql")).toThrow();
    expect(readFileSync("migrations/0022_provider_record.sql", "utf8")).toMatch(/CREATE TABLE IF NOT EXISTS "ProviderRecord"/);
  });
  // El «la 0023 sigue propuesta» de REQ-772 quedó REEMPLAZADO por REQ-773 (la 0023 se aplica en su propio deploy, después de la 0022).
  it("REQ-746 solo crea tablas e índices; no toca Tour, TourTranslation, Trip ni la taxonomía", () => {
    const code = SQL_0022.replace(/--[^\n]*/g, "");
    expect(code).not.toMatch(/\b(ALTER|DROP|UPDATE|DELETE|INSERT)\b/i);
    expect(code).not.toMatch(/"(Tour|TourTranslation|Trip|ExperienceTaxonomy)"/);
    const tables = (db().prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all() as { name: string }[]).map((t) => t.name);
    expect(tables).toEqual(["ProviderDocument", "ProviderRecord", "Tour"]);
  });
  it("REQ-746 tiene todas las columnas pedidas y se puede aplicar dos veces", () => {
    const d = db();
    d.exec(SQL_0022);
    const cols = (d.prepare(`PRAGMA table_info("ProviderRecord")`).all() as { name: string }[]).map((c) => c.name);
    for (const c of ["provider", "externalId", "experienceKind", "experienceId", "rawHash", "r2Key", "fetchedAt", "providerUpdatedAt", "sourceRef", "sourceDocKey", "sourcePage", "runId"]) {
      expect(cols).toContain(c);
    }
  });
  it("REQ-746 único por (provider, externalId, rawHash): la misma huella no crea otra versión", () => {
    const d = db();
    ins(d);
    expect(() => ins(d, "h1", "otra-clave")).toThrow();
    ins(d, "h2");
    expect(d.prepare(`SELECT COUNT(*) AS n FROM "ProviderRecord"`).all()).toEqual([{ n: 2 }]);
  });
  it("REQ-746 rechaza un tipo de experiencia que no existe", () => {
    const d = db();
    expect(() => d.prepare(`INSERT INTO "ProviderRecord" ("id","provider","externalId","rawHash","r2Key","bytes","fetchedAt","lastSeenAt","runId","experienceKind") VALUES ('k','p','1','h','k',1,'x','x','r','hotel')`).run()).toThrow();
  });
});
