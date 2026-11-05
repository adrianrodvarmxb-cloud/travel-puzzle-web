import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createDeparturesRepo } from "./repository";

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };
const asD1 = (d: Db) => ({ prepare: (sql: string) => ({ bind: (...v: unknown[]) => ({ all: async () => ({ results: d.prepare(sql).all(...v) as Record<string, unknown>[] }), run: async () => d.prepare(sql).run(...v) }) }) });

describe("REQ-049 repositorio de salidas (SQLite real con la migración 0012)", () => {
  function db() {
    const d = new DatabaseSync(":memory:");
    d.exec(`CREATE TABLE "Tour"("id" TEXT PRIMARY KEY, "externalId" INTEGER, "isActive" BOOLEAN)`);
    d.exec(readFileSync("migrations/0012_salidas.sql", "utf8"));
    d.exec(`INSERT INTO "Tour"("id","externalId","isActive","departuresCheckedAt") VALUES ('nuevo',1,1,NULL),('viejo',2,1,'2026-11-01T00:00:00.000+00:00'),('reciente',3,1,'2026-11-05T10:00:00.000+00:00'),('inactivo',4,0,NULL)`);
    return d;
  }
  it("REQ-049: la tanda trae primero los nunca revisados, luego los más viejos; no los recientes ni inactivos", async () => {
    const r = createDeparturesRepo(asD1(db()));
    expect(await r.dueTours(10, new Date("2026-11-04T16:00:00Z"))).toEqual([{ id: "nuevo", externalId: 1 }, { id: "viejo", externalId: 2 }]);
    expect(await r.dueTours(1, new Date("2026-11-04T16:00:00Z"))).toEqual([{ id: "nuevo", externalId: 1 }]);
  });
  it("REQ-049: guarda idiomas, fechas y marcas de tiempo", async () => {
    const d = db(); const r = createDeparturesRepo(asD1(d));
    await r.saveSummary("nuevo", { languages: ["en", "es"], dates: ["2026-11-06"] }, new Date("2026-11-05T12:00:00Z"));
    expect(d.prepare(`SELECT "guideLanguages","departureDates","departuresSyncedAt" FROM "Tour" WHERE "id"='nuevo'`).all()[0])
      .toMatchObject({ guideLanguages: '["en","es"]', departureDates: '["2026-11-06"]', departuresSyncedAt: "2026-11-05T12:00:00.000+00:00" });
  });
});
