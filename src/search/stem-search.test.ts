/**
 * REQ-360…366: raíz (Snowball) y sinónimos en el índice FTS5, de punta a punta en node:sqlite con la migración
 * propuesta 0021 (TourSearch con columna stem). Con la bandera apagada, el índice de la 0011 sigue igual.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { rebuildTourSearch, rebuildTourSearchStem, searchTourIds, searchTourIdsStem, type D1Batch } from "./fts-search";
import { ftsStemQueries, isSearchStem, stemText, BM25_WEIGHTS } from "./lib/fts-stem";
import { stemEs, STEM_VERSION } from "./lib/stem";
import { BRAND, buildSynonyms, expandSynonyms, type TaxonomyTerm } from "./lib/synonyms";
import { searchRebuilder } from "./rebuild";

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };
const SYN = buildSynonyms(JSON.parse(readFileSync("data/search-synonyms.json", "utf8"))).map;
const REF = JSON.parse(readFileSync("src/search/data/stem-es-snowball.json", "utf8")) as Record<string, string>;

const TOURS: [string, string, string][] = [
  ["M1", "Visita a los museos del centro", "Museum visit"],
  ["M2", "Museo del Prado con guía", "Prado museum guided"],
  ["N1", "Tour nocturno por el barrio gótico", "Night tour gothic quarter"],
  ["G1", "Tour gratis por el centro histórico", "Free walking tour old town"],
  ["W1", "Recorrido a pie por Montmartre", "Montmartre walking tour"],
  ["T1", "Traslado del aeropuerto al hotel", "Airport transfer"],
  ["C1", "Catedrales y castillos", "Cathedrals and castles"],
];

function setup(migration: string) {
  const d = new DatabaseSync(":memory:");
  d.exec(`CREATE TABLE "Country"(id INTEGER PRIMARY KEY, translations TEXT);
    CREATE TABLE "City"(id INTEGER PRIMARY KEY, translations TEXT);
    CREATE TABLE "Tour"(id TEXT PRIMARY KEY, isActive BOOLEAN, cityId INTEGER, countryId INTEGER);
    CREATE TABLE "TourTranslation"(tourId TEXT, language TEXT, title TEXT, brief TEXT);
    INSERT INTO City VALUES (1, '{"es":"Madrid","en":"Madrid"}'); INSERT INTO Country VALUES (1, '{"es":"España","en":"Spain"}');`);
  for (const [id, es, en] of TOURS) {
    d.prepare(`INSERT INTO Tour VALUES (?,1,1,1)`).run(id);
    d.prepare(`INSERT INTO TourTranslation VALUES (?,?,?,?)`).run(id, "es", es, "");
    d.prepare(`INSERT INTO TourTranslation VALUES (?,?,?,?)`).run(id, "en", en, "");
  }
  d.exec(readFileSync(migration, "utf8"));
  let batches = 0;
  const db: D1Batch = {
    prepare: (sql) => ({ bind: (...v) => ({ all: async () => ({ results: d.prepare(sql).all(...v) as Record<string, unknown>[] }), run: async () => d.prepare(sql).run(...v) }) }),
    batch: async (sts) => { batches++; for (const s of sts as { run(): Promise<unknown> }[]) await s.run(); return []; },
  };
  return { d, db, batches: () => batches };
}
const PROPOSED = "docs/migraciones-propuestas/0021_tour_search_stem.sql";

describe("REQ-360 stemmer Snowball en español", () => {
  it(`igual a la implementación de referencia en ${Object.keys(REF).length} palabras (títulos reales + casos difíciles)`, () => {
    const bad = Object.entries(REF).filter(([w, s]) => stemEs(w) !== s);
    expect(bad).toEqual([]);
  });
  it("plurales y género se juntan; «tour», «turismo» y «turista» no", () => {
    expect(new Set(["museo", "museos"].map(stemEs)).size).toBe(1);
    expect(new Set(["nocturno", "nocturna", "nocturnos"].map(stemEs)).size).toBe(1);
    expect(new Set(["tour", "turismo", "turista"].map(stemEs)).size).toBe(3);
  });
  it("texto → raíces sin palabras vacías ni repetidas; versión declarada", () => {
    expect(stemText("Visita a los museos del museo")).toBe("visit muse");
    expect(STEM_VERSION).toBe(1);
  });
});

describe("REQ-361/362 sinónimos", () => {
  it("equivalentes en los dos sentidos; «tour a pie» NO trae «gratis» (un sentido)", () => {
    expect(SYN.get("tour gratis")).toContain("free tour");
    expect(SYN.get("free tour")).toContain("tour gratis");
    expect(SYN.get("free walking tour")).toContain("tour a pie");
    expect(SYN.get("tour a pie")).not.toContain("free tour");
    expect(SYN.get("tour a pie")).not.toContain("tour gratis");
  });
  it("ningún sinónimo lleva la marca del proveedor", () => {
    for (const [k, v] of SYN) for (const x of [k, ...v]) expect(BRAND.test(x)).toBe(false);
    const withBrand = buildSynonyms({ version: 1, groups: [{ mode: "equivalente", terms: ["free tour", "freetour", "freetour.com"] }] }).map;
    expect([...withBrand.get("free tour")!]).toEqual(["free tour"]);
  });
  it("taxonomía T1: términos activos o de muestra suman sus sinónimos; ocultos y tras bandera no", () => {
    const terms: TaxonomyTerm[] = [
      { termino_es: "Caminata (tour a pie)", sinonimos: ["walking tour", "recorrido a pie"], estado: "activo" },
      { termino_es: "Excursión de un día", sinonimos: ["day trip", "full day"], estado: "activo" },
      { termino_es: "Accesible", sinonimos: ["silla de ruedas"], estado: "tras_bandera" },
    ];
    const m = buildSynonyms({ version: 1, groups: [] }, terms).map;
    expect(m.get("full day")).toContain("excursion de un dia");
    expect(m.get("walking tour")).toContain("recorrido a pie");
    expect(m.has("silla de ruedas")).toBe(false);
  });
  it("grupo inválido se descarta", () => {
    expect(buildSynonyms({ version: 1, groups: [{ mode: "x" }, { mode: "equivalente", terms: ["a"] }] }).rejected).toBe(2);
  });
  it("expande el grupo más largo y deja las demás palabras", () => {
    expect(expandSynonyms(["tour", "gratis", "madrid"], SYN)).toEqual([{ kind: "phrase", phrases: SYN.get("tour gratis") }, { kind: "word", word: "madrid" }]);
  });
});

describe("REQ-363/364 consultas con raíz y sinónimos (FTS5 real, migración propuesta 0021)", () => {
  it("exacta primero con su raíz; prefijo solo en la última; respaldo; destino en place", () => {
    const q = ftsStemQueries("museos nocturnos", "Madrid", SYN);
    expect(q[0]).toBe('("museos" OR "museo" OR stem : "muse") AND ("nocturnos" OR "nocturno" OR stem : "nocturn") AND place : "madrid"');
    expect(q[1]).toContain('"nocturnos"*');
    expect(BM25_WEIGHTS[2]).toBeGreaterThan(BM25_WEIGHTS[5]); // el título exacto pesa más que la raíz
  });
  it("«museo» encuentra «museos» y «nocturna» encuentra «nocturno» por la raíz", async () => {
    const { db } = setup(PROPOSED);
    await rebuildTourSearchStem(db);
    expect(await searchTourIdsStem(db, "es", "museo", SYN)).toEqual(expect.arrayContaining(["M1", "M2"]));
    expect(await searchTourIdsStem(db, "es", "nocturna", SYN)).toEqual(["N1"]);
  });
  it("la coincidencia exacta va antes que la de raíz («museo» → M2 «Museo del Prado» primero)", async () => {
    const { db } = setup(PROPOSED);
    await rebuildTourSearchStem(db);
    expect((await searchTourIdsStem(db, "es", "museo", SYN))![0]).toBe("M2");
  });
  it("sinónimos: «free tour» encuentra «Tour gratis…»; «tour a pie» encuentra «Recorrido a pie» sin buscar «gratis»", async () => {
    const { db } = setup(PROPOSED);
    await rebuildTourSearchStem(db);
    expect(await searchTourIdsStem(db, "es", "free tour", SYN)).toContain("G1");
    expect(await searchTourIdsStem(db, "es", "tour a pie", SYN)).toContain("W1");
    // un tour a pie no implica gratis: la consulta nunca pide «gratis» ni «free tour» (G1 solo sale si su título dice «walking tour»)
    for (const q of ftsStemQueries("tour a pie", null, SYN)) expect(q).not.toMatch(/gratis|"free tour"/);
    expect(await searchTourIdsStem(db, "es", "transfer", SYN)).toContain("T1");
  });
  it("la reconstrucción llena las raíces de las filas en español, en lotes", async () => {
    const { d, db, batches } = setup(PROPOSED);
    const r = await rebuildTourSearchStem(db);
    expect(r.rows).toBe(TOURS.length);
    expect(batches()).toBe(1);
    expect(d.prepare(`SELECT stem FROM TourSearch WHERE tourId = 'C1' AND language = 'es'`).all()).toEqual([{ stem: "catedral castill" }]);
    expect(d.prepare(`SELECT stem FROM TourSearch WHERE tourId = 'C1' AND language = 'en'`).all()).toEqual([{ stem: "" }]);
  });
});

describe("REQ-365/366 compatibilidad y bandera", () => {
  it("con la migración propuesta aplicada, el código de siempre (bandera apagada) sigue funcionando", async () => {
    const { db } = setup(PROPOSED);
    await rebuildTourSearch(db);
    expect(await searchTourIds(db, "es", "museos")).toEqual(expect.arrayContaining(["M1", "M2"])); // singular simple de REQ-122
    expect(await searchTourIds(db, "es", "nocturna")).toEqual([]); // sin raíz no llega a «nocturno»
  });
  it("SEARCH_STEM_ENABLED solo con «true»; sin SEARCH_V2 no se reconstruye nada", () => {
    expect(isSearchStem("true")).toBe(true);
    for (const v of [undefined, "false", "1"]) expect(isSearchStem(v)).toBe(false);
    expect(searchRebuilder({}, () => null)).toBeUndefined();
    expect(searchRebuilder({ SEARCH_V2_ENABLED: "true" }, () => null)).toBeTypeOf("function");
  });
  it("la migración propuesta NO está en migrations/ y documenta el respaldo (DROP → exportar → reaplicar)", () => {
    expect(readdirSync("migrations").some((f) => /stem/.test(f))).toBe(false);
    const sql = readFileSync(PROPOSED, "utf8");
    expect(sql).toMatch(/DROP TABLE "TourSearch"; 2\) exportar; ?\n?-- ?3\) aplicar/);
  });
});
