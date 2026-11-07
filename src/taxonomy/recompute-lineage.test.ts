import { describe, expect, it } from "vitest";
import { AGENCY_MAPPINGS as A, DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "./data/index";
import { createTaxonomyRepo, type TaxonomyD1 } from "./repository";
import { createLineageRepo } from "./lineage-repository";
import { runTaxonomyStep } from "./recompute";
import { asD1, sqlite, MIGRATION_0022, type Sqlite } from "@/ingest/test-utils";

// Datos inventados (REQ-748).
function db() {
  const d = sqlite("migrations/0017_taxonomia.sql", MIGRATION_0022, "migrations/0023_taxonomia_linaje.sql");
  d.exec(`CREATE TABLE "Tour"("id" TEXT PRIMARY KEY, "externalId" INTEGER, "categoryId" INTEGER, "priceValue" TEXT, "durationMinutes" INTEGER, "isActive" BOOLEAN, "guideLanguages" TEXT DEFAULT '[]', "rating" TEXT, "reviewsNumber" INTEGER DEFAULT 0)`);
  d.exec(`CREATE TABLE "TourTranslation"("tourId" TEXT, "language" TEXT, "title" TEXT, "brief" TEXT)`);
  d.exec(`CREATE TABLE "Trip"("id" TEXT PRIMARY KEY, "kind" TEXT, "category" TEXT, "durationDays" INTEGER, "titleEs" TEXT, "titleEn" TEXT, "priceFrom" REAL, "languages" TEXT, "options" TEXT, "flightsIncluded" BOOLEAN, "status" TEXT)`);
  d.prepare(`INSERT INTO "Tour" VALUES ('a',101,12,'0',120,1,'["Spanish"]','4.8',60)`).run();
  d.prepare(`INSERT INTO "TourTranslation" VALUES ('a','es','Free tour por el casco antiguo','')`).run();
  d.prepare(`INSERT INTO "Tour" VALUES ('b',102,5,'40',120,1,'[]',NULL,0)`).run();
  d.prepare(`INSERT INTO "TourTranslation" VALUES ('b','es','Tapas y vino','')`).run();
  d.prepare(`INSERT INTO "Trip" VALUES ('fch-fch-r1','circuito','cultural',10,'China básico','China basic',1500,'["es"]','[]',0,'published')`).run();
  d.prepare(`INSERT INTO "Trip" VALUES ('ext-vam','tour','cultural',1,'Versalles','Versailles',90,'["es"]','[]',0,'published')`).run();
  const rec = (id: string, provider: string, ext: string, kind: string | null, expId: string | null, hash: string, at: string, orig: [string, string] | null = null, declared: string | null = null) =>
    d.prepare(`INSERT INTO "ProviderRecord" ("id","provider","externalId","experienceKind","experienceId","rawHash","r2Key","bytes","fetchedAt","lastSeenAt","originalField","originalCategory","declaredTaxonomy","runId") VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?,'r')`)
      .run(id, provider, ext, kind, expId, hash, id, at, at, orig?.[0] ?? null, orig?.[1] ?? null, declared);
  rec("k1", "freetour", "101", "tour", null, "h-old", "2026-11-01T00:00:00Z");
  rec("k2", "freetour", "101", "tour", null, "h-new", "2026-11-05T00:00:00Z");
  rec("k3", "fantasticachina", "FCH-R1", "trip", "fch-fch-r1", "h-fch", "2026-11-05T00:00:00Z", ["ref", "TOUR REGULAR"]);
  rec("k4", "extime", "VAM", "trip", "ext-vam", "h-ext", "2026-11-05T00:00:00Z", null, '{"formato":"excursion-dia","temas":["cultural"]}');
  d.prepare(`INSERT INTO "ExperienceTaxonomyOverride" VALUES ('tour','b','tema','cultural','add','vino y cultura','po','2026-11-06T00:00:00Z')`).run();
  return d;
}

async function fullRun(d: Sqlite) {
  let n = 0;
  const deps = { repo: createTaxonomyRepo(asD1<TaxonomyD1>(d)), dict: D, mappings: M, lastSyncAt: "2026-11-06T05:00:00.000Z", newId: () => `run-${++n}`, batch: 10,
    lineage: { repo: createLineageRepo(asD1<TaxonomyD1>(d)), agencyMappings: A } };
  for (let i = 0; i < 10; i++) {
    const r = await runTaxonomyStep({ ...deps, now: new Date(Date.UTC(2026, 10, 6, 6, i)) });
    if (r.action === "publish" || r.action === "abort") return r;
  }
  throw new Error("no terminó");
}
const row = (d: Sqlite, id: string, axis: string) => d.prepare(`SELECT "term","ruleId","origin","sourceField","sourceValue","matchedTerm","sourceRawHash" FROM "ExperienceTaxonomy" WHERE "experienceId"=? AND "axis"=?`).all(id, axis) as Record<string, string | null>[];

describe("REQ-756 recálculo con linaje (SQLite real con 0017 + 0022 + 0023)", () => {
  it("REQ-756 cada término queda con su origen, campo, valor original y la huella vigente del crudo", async () => {
    const d = db();
    expect((await fullRun(d)).action).toBe("publish");
    expect(row(d, "a", "formato")[0]).toMatchObject({ term: "pieza-libre", origin: "regla", sourceField: "price.value", sourceValue: "0", sourceRawHash: "h-new" });
  });
  it("REQ-753 el viaje con denominación original se clasifica con el mapeo de su agencia", async () => {
    const d = db();
    await fullRun(d);
    expect(row(d, "fch-fch-r1", "formato")[0]).toMatchObject({ term: "circuito", ruleId: "fijo fantasticachina:TOUR REGULAR", sourceField: "ref", sourceValue: "TOUR REGULAR", sourceRawHash: "h-fch" });
  });
  it("REQ-754 el override manual gana y queda marcado como manual", async () => {
    const d = db();
    await fullRun(d);
    expect(row(d, "b", "tema").find((r) => r.term === "cultural")).toMatchObject({ origin: "manual", ruleId: "manual: po · vino y cultura" });
  });
  it("REQ-753 sin denominación original cae al mapeo propio y sigue ligado a su crudo", async () => {
    const d = db();
    await fullRun(d);
    expect(row(d, "ext-vam", "formato")[0]).toMatchObject({ sourceField: "trip.kind", sourceValue: "tour", sourceRawHash: "h-ext", origin: "regla" });
  });
  it("REQ-409 no escribe en Tour, TourTranslation, Trip ni ProviderRecord", async () => {
    const d = db();
    const snap = () => JSON.stringify(["Tour", "TourTranslation", "Trip", "ProviderRecord"].map((t) => d.prepare(`SELECT * FROM "${t}" ORDER BY 1`).all()));
    const before = snap();
    await fullRun(d);
    expect(snap()).toBe(before);
  });
});
