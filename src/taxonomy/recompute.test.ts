import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "./data/index";
import { createTaxonomyRepo, type TaxonomyD1 } from "./repository";
import { runTaxonomyStep } from "./recompute";
import { barrier, mappingVersion, planTaxonomyStep, taxonomySyncEnabled, tourToInput, tripToInput, unmappedFrom, TOURS_DONE } from "./lib/run-plan";

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };
const asD1 = (d: Db): TaxonomyD1 => {
  const prep = (sql: string) => ({ bind: (...v: unknown[]) => ({ sql, v, all: async () => ({ results: d.prepare(sql).all(...v) as Record<string, unknown>[] }), run: async () => d.prepare(sql).run(...v) }) });
  return { prepare: prep, batch: async (stmts: unknown[]) => { for (const s of stmts as { sql: string; v: unknown[] }[]) d.prepare(s.sql).run(...s.v); } } as unknown as TaxonomyD1;
};

function db() {
  const d = new DatabaseSync(":memory:");
  d.exec(`CREATE TABLE "Tour"("id" TEXT PRIMARY KEY, "categoryId" INTEGER, "priceValue" TEXT, "durationMinutes" INTEGER, "isActive" BOOLEAN, "guideLanguages" TEXT DEFAULT '[]', "rating" TEXT, "reviewsNumber" INTEGER DEFAULT 0, "contentHash" TEXT)`);
  d.exec(`CREATE TABLE "TourTranslation"("tourId" TEXT, "language" TEXT, "title" TEXT, "brief" TEXT)`);
  d.exec(`CREATE TABLE "Trip"("id" TEXT PRIMARY KEY, "kind" TEXT, "category" TEXT, "durationDays" INTEGER, "titleEs" TEXT, "titleEn" TEXT, "priceFrom" REAL, "languages" TEXT, "options" TEXT, "flightsIncluded" BOOLEAN, "status" TEXT)`);
  d.exec(readFileSync("migrations/0017_taxonomia.sql", "utf8"));
  const tour = (id: string, cat: number, price: number, title: string, active = 1, minutes = 120) => {
    d.prepare(`INSERT INTO "Tour" VALUES (?,?,?,?,?,'["Spanish"]','4.8',60,?)`).run(id, cat, String(price), minutes, active, `h-${id}`);
    d.prepare(`INSERT INTO "TourTranslation" VALUES (?,?,?,?)`).run(id, "es", title, "");
  };
  tour("a", 12, 0, "Free tour por el casco antiguo");
  tour("b", 12, 15, "Barrio gótico a pie");
  tour("c", 5, 40, "Tapas y vino");
  tour("d", 99, 10, "Algo nuevo");
  tour("e", 4, 60, "Excursión a Toledo", 1, 480); // REQ-534: la excursión de FREETOUR exige ≥ 6 h
  tour("z", 12, 0, "Inactivo", 0);
  d.prepare(`INSERT INTO "Trip" VALUES ('t1','circuito','cultural',8,'Perú esencial','Essential Peru',1500,'["es"]','[{"mode":"private"}]',0,'published')`).run();
  d.prepare(`INSERT INTO "Trip" VALUES ('t2','tour','urbano',1,'Borrador','Draft',10,'[]','[]',0,'draft')`).run();
  // REQ-1253: el recálculo lee el nombre de la ciudad base (Tour.cityId → City.translations), como en producción.
  d.exec(`ALTER TABLE "Tour" ADD COLUMN "cityId" INTEGER`);
  d.exec(`CREATE TABLE "City"("id" INTEGER PRIMARY KEY, "translations" TEXT)`);
  return d;
}
const SYNC = "2026-11-06T05:00:00.000Z";
const step = (d: Db, now: string, over: Partial<Parameters<typeof runTaxonomyStep>[0]> = {}) => {
  let n = 0;
  return runTaxonomyStep({ repo: createTaxonomyRepo(asD1(d)), dict: D, mappings: M, lastSyncAt: SYNC, now: new Date(now), newId: () => `run-${now}-${++n}`, batch: 2, ...over });
};
async function fullRun(d: Db, now: string, over = {}) {
  const out = [];
  for (let i = 0; i < 10; i++) {
    const r = await step(d, now, over);
    out.push(r);
    if (r.action === "publish" || r.action === "abort" || r.action === "idle") break;
  }
  return out;
}

describe("REQ-409 recálculo por tandas tras el sync, en tablas propias", () => {
  it("REQ-409 bandera TAXONOMY_SYNC_ENABLED: solo \"true\" exacto; wrangler.jsonc la trae en \"false\"", () => {
    expect(taxonomySyncEnabled({})).toBe(false);
    expect(taxonomySyncEnabled({ TAXONOMY_SYNC_ENABLED: "true" })).toBe(true);
    expect(readFileSync("wrangler.jsonc", "utf8")).toMatch(/"TAXONOMY_SYNC_ENABLED":\s*"false"/);
  });
  it("REQ-409 una corrida completa: arranca, clasifica activos por tandas, luego viajes publicados, y publica", async () => {
    const d = db();
    const actions = (await fullRun(d, "2026-11-06T06:00:00.000Z")).map((r) => r.action);
    expect(actions).toEqual(["start", "tours", "tours", "tours", "trips", "publish"]);
    const formatos = Object.fromEntries((d.prepare(`SELECT "experienceId","term" FROM "ExperienceTaxonomy" WHERE "axis"='formato'`).all() as { experienceId: string; term: string }[]).map((r) => [r.experienceId, r.term]));
    expect(formatos).toEqual({ a: "pieza-libre", b: "caminata", c: "caminata" /* REQ-1252: cat. 5 sin señal, por defecto caminata */, d: "por-revisar", e: "excursion-dia", t1: "circuito" });
    expect(d.prepare(`SELECT "term" FROM "ExperienceTaxonomy" WHERE "experienceId"='a' AND "axis"='atributo' ORDER BY "term"`).all()).toEqual(expect.arrayContaining([{ term: "idioma-es" }, { term: "favorito" }]));
  });
  it("REQ-409 no escribe en Tour, TourTranslation ni Trip (ni el content_hash)", async () => {
    const d = db();
    const snap = () => JSON.stringify([d.prepare(`SELECT * FROM "Tour" ORDER BY "id"`).all(), d.prepare(`SELECT * FROM "TourTranslation"`).all(), d.prepare(`SELECT * FROM "Trip"`).all()]);
    const before = snap();
    await fullRun(d, "2026-11-06T06:00:00.000Z");
    expect(snap()).toBe(before);
  });
  it("REQ-408 la categoría sin mapear queda por-revisar, se registra en la corrida y no aborta", async () => {
    const d = db();
    await fullRun(d, "2026-11-06T06:00:00.000Z");
    const run = d.prepare(`SELECT "status","unmapped","unclassified" FROM "TaxonomyRun"`).all()[0] as Record<string, unknown>;
    expect(run).toMatchObject({ status: "published", unclassified: 1 });
    expect(JSON.parse(String(run.unmapped))).toEqual([{ provider: "freetour", categoryId: "99", tours: 1 }]);
  });
  it("REQ-409 sin sync nuevo y con el mismo mapeo no hace nada; un sync nuevo arranca otra corrida", async () => {
    const d = db();
    await fullRun(d, "2026-11-06T06:00:00.000Z");
    expect((await step(d, "2026-11-06T07:00:00.000Z")).action).toBe("idle");
    expect((await step(d, "2026-11-07T07:00:00.000Z", { lastSyncAt: "2026-11-07T05:00:00.000Z" })).action).toBe("start");
  });
  it("REQ-409 barrera: si un formato cae más de 30 %, la corrida se aborta y se sigue leyendo la anterior", async () => {
    const d = db();
    for (let i = 0; i < 30; i++) {
      d.prepare(`INSERT INTO "Tour" VALUES (?,12,'15',120,1,'[]',NULL,0,'h',NULL)`).run(`w${String(i).padStart(2, "0")}`);
      d.prepare(`INSERT INTO "TourTranslation" VALUES (?,?,?,?)`).run(`w${String(i).padStart(2, "0")}`, "es", "Visita", ""); // REQ-541: «Caminata» en el título ya es a pie en cualquier categoría
    }
    await fullRun(d, "2026-11-06T06:00:00.000Z", { batch: 50 });
    d.exec(`UPDATE "Tour" SET "categoryId"=19 WHERE "id" LIKE 'w%'`);
    const last = (await fullRun(d, "2026-11-07T06:00:00.000Z", { batch: 50, lastSyncAt: "2026-11-07T05:00:00.000Z" })).at(-1)!;
    expect(last).toMatchObject({ action: "abort", reason: expect.stringContaining("caminata cae de 32 a 2") /* REQ-1252: «Tapas y vino» también es caminata */ });
    const runs = d.prepare(`SELECT "status" FROM "TaxonomyRun" ORDER BY "startedAt"`).all();
    expect(runs).toEqual([{ status: "published" }, { status: "aborted" }]);
  });
  it("REQ-409 poda: conserva las filas de las 3 corridas publicadas más recientes; la bitácora se queda entera", async () => {
    const d = db();
    for (const day of ["01", "02", "03", "04", "05"]) await fullRun(d, `2026-11-${day}T06:00:00.000Z`, { lastSyncAt: `2026-11-${day}T05:00:00.000Z`, batch: 50 });
    expect(d.prepare(`SELECT COUNT(*) AS n FROM "TaxonomyRun" WHERE "status"='published'`).all()).toEqual([{ n: 5 }]);
    expect(d.prepare(`SELECT COUNT(DISTINCT "runId") AS n FROM "ExperienceTaxonomy"`).all()).toEqual([{ n: 3 }]);
  });
  it("REQ-409 si cambia el diccionario o un mapeo, la corrida en curso se reemplaza", async () => {
    const d = db();
    await step(d, "2026-11-06T06:00:00.000Z");
    const otro = { ...M, freetour: { ...M.freetour, version: "2026-11-07" } };
    expect((await step(d, "2026-11-06T06:01:00.000Z", { mappings: otro })).action).toBe("start");
    expect(d.prepare(`SELECT "status","abortReason" FROM "TaxonomyRun" ORDER BY "startedAt" LIMIT 1`).all()).toEqual([{ status: "aborted", abortReason: "superseded" }]);
  });
});

describe("REQ-409 lógica pura del recálculo", () => {
  it("REQ-409 plan del minuto", () => {
    const run = { id: "r", status: "running" as const, startedAt: "2026-11-06T06:00:00Z", cursor: "", tripsDone: false, mappingVersion: "v" };
    expect(planTaxonomyStep({ running: run, lastPublished: null, lastSyncAt: null, version: "v" }).action).toBe("tours");
    expect(planTaxonomyStep({ running: { ...run, cursor: TOURS_DONE }, lastPublished: null, lastSyncAt: null, version: "v" }).action).toBe("trips");
    expect(planTaxonomyStep({ running: { ...run, cursor: TOURS_DONE, tripsDone: true }, lastPublished: null, lastSyncAt: null, version: "v" }).action).toBe("close");
    expect(planTaxonomyStep({ running: null, lastPublished: null, lastSyncAt: null, version: "v" }).action).toBe("start");
  });
  it("REQ-409 entrada del clasificador desde Tour y Trip", () => {
    expect(tourToInput({ id: "x", categoryId: 12, priceValue: "0", durationMinutes: 90, titleEs: "Hola", titleEn: "Hi", briefEs: null, briefEn: null, guideLanguages: '["Spanish","English"]', rating: "4.9", reviewsNumber: 70 }))
      .toMatchObject({ proveedor: "freetour", categoriaId: 12, precio: 0, titulo: "Hola | Hi", idiomas: ["es", "en"], calificacion: 4.9, resenas: 70 });
    expect(tripToInput({ id: "t", kind: "tour", category: "ecoturismo", durationDays: 1, titleEs: "A", titleEn: "B", priceFrom: 10, languages: '["es"]', options: '[{"mode":"group"},{"mode":"private"}]', flightsIncluded: 1 }))
      .toMatchObject({ proveedor: "propios", categoriaId: "tour", fuentesTema: ["ecoturismo"], modos: ["group", "private"], vueloIncluido: true });
  });
  it("REQ-409 barrera: vacía, >20 % sin formato, caída >30 %; un formato chico no dispara", () => {
    expect(barrier({ formato: {}, tema: {}, total: 0 }, null)).toBe("corrida vacía");
    expect(barrier({ formato: { "por-revisar": 21, tour: 79 }, tema: {}, total: 100 }, null)).toMatch(/sin formato/);
    expect(barrier({ formato: { "por-revisar": 20, tour: 80 }, tema: {}, total: 100 }, null)).toBeNull();
    expect(barrier({ formato: { tour: 69 }, tema: {}, total: 69 }, { formato: { tour: 100 }, tema: {}, total: 100 })).toMatch(/tour cae/);
    expect(barrier({ formato: { tour: 100, traslado: 0 }, tema: {}, total: 100 }, { formato: { tour: 100, traslado: 9 }, tema: {}, total: 109 })).toBeNull();
  });
  it("REQ-408 categorías sin mapear desde las reglas", () => {
    expect(unmappedFrom([{ ruleId: "sin mapeo: freetour:99", n: 3 }, { ruleId: "#3 base freetour:26", n: 1 }])).toEqual([{ provider: "freetour", categoryId: "99", tours: 3 }]);
  });
  it("REQ-409 la versión del mapeo junta diccionario y proveedores", () => {
    expect(mappingVersion(D, M)).toBe("dict:2026-11-06|freetour:2026-11-06|propios:2026-11-06");
  });
});
