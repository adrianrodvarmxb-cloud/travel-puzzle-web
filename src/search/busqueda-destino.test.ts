/**
 * REQ-122: casos del PO de punta a punta con la migración 0011 real en node:sqlite
 * (índice FTS5 → ids por relevancia → catálogo en memoria), bandera encendida y apagada.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { searchTourIds, type D1Like } from "./fts-search";
import { rankedOrFallback } from "./lib/fts-query";
import { queryCatalog, splitDestination, toEntry } from "@/catalog/lib/query";

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };
const J = JSON.stringify;

const COUNTRIES: Record<number, object> = {
  1: { en: "Italy", es: "Italia", it: "Italia", pt: "Itália", de: "Italien", fr: "Italie" },
  2: { en: "Romania", es: "Rumania", it: "Romania", pt: "Romênia", de: "Rumänien", fr: "Roumanie" },
  3: { en: "Mexico", es: "México", it: "Messico", pt: "México", de: "Mexiko", fr: "Mexique" },
  4: { en: "Peru", es: "Perú", it: "Perù", pt: "Peru", de: "Peru", fr: "Pérou" },
};
const CITIES: Record<number, [number, object]> = {
  10: [1, { en: "Rome", es: "Roma", it: "Roma", pt: "Roma", de: "Rom", fr: "Rome" }],
  11: [2, { en: "Bucharest", es: "Bucarest", it: "Bucarest", pt: "Bucareste", de: "Bukarest", fr: "Bucarest" }],
  12: [3, { en: "Leon", es: "León", it: "León", pt: "León", de: "León", fr: "León" }],
  13: [4, { en: "Cusco", es: "Cusco", it: "Cusco", pt: "Cusco", de: "Cusco", fr: "Cuzco" }],
  14: [1, { en: "Florence", es: "Florencia", it: "Firenze", pt: "Florença", de: "Florenz", fr: "Florence" }],
};
const TOURS: [string, number, string, string, number][] = [
  ["R1", 10, "Free tour por Roma", "Rome Free Walking Tour", 900],
  ["R2", 10, "Visita guiada al Coliseo", "Colosseum guided visit", 500],
  ["R3", 10, "Tour del Trastevere: arte y barrio", "Trastevere art and neighbourhood tour", 300],
  ["B1", 11, "Free tour por Bucarest", "Bucharest Free Tour", 800],
  ["L1", 12, "Tour del Jardín Romántico de León", "Leon Romantic Garden Tour", 200],
  ["C1", 13, "Free tour por Cusco", "Cusco Free Tour", 700],
  ["F1", 14, "Tour de arte en Florencia", "Florence art tour", 400],
  ["F2", 14, "Free tour Florencia: de Roma a los Medici", "Florence free tour: from Rome to the Medici", 100],
];

function setup() {
  const d = new DatabaseSync(":memory:");
  d.exec(`CREATE TABLE "Country"(id INTEGER PRIMARY KEY, translations TEXT);
    CREATE TABLE "City"(id INTEGER PRIMARY KEY, translations TEXT);
    CREATE TABLE "Tour"(id TEXT PRIMARY KEY, isActive BOOLEAN, cityId INTEGER, countryId INTEGER);
    CREATE TABLE "TourTranslation"(tourId TEXT, language TEXT, title TEXT, brief TEXT);`);
  for (const [id, t] of Object.entries(COUNTRIES)) d.prepare(`INSERT INTO Country VALUES (?,?)`).run(Number(id), J(t));
  for (const [id, [, t]] of Object.entries(CITIES)) d.prepare(`INSERT INTO City VALUES (?,?)`).run(Number(id), J(t));
  for (const [id, city, es, en] of TOURS) {
    d.prepare(`INSERT INTO Tour VALUES (?,1,?,?)`).run(id, city, CITIES[city][0]);
    d.prepare(`INSERT INTO TourTranslation VALUES (?,?,?,?)`).run(id, "es", es, "");
    d.prepare(`INSERT INTO TourTranslation VALUES (?,?,?,?)`).run(id, "en", en, "");
  }
  d.exec(readFileSync("migrations/0011_busqueda_fts.sql", "utf8"));
  const db: D1Like = { prepare: (sql) => ({ bind: (...v) => ({ all: async () => ({ results: d.prepare(sql).all(...v) as Record<string, unknown>[] }), run: async () => d.prepare(sql).run(...v) }) }) };
  const entries = TOURS.map(([id, city, es, , reviews]) => toEntry({
    id, cityId: city, countryId: CITIES[city][0], reviewsNumber: reviews, title: es, brief: "",
    cityTr: J(CITIES[city][1]), countryTr: J(COUNTRIES[CITIES[city][0]]),
  }, "es"));
  return { db, entries };
}

/** El mismo cableado que tour-repository con SEARCH_V2_ENABLED="true". */
async function buscarV2(q: string) {
  const { db, entries } = setup();
  const s = splitDestination(entries, q);
  const ranked = rankedOrFallback(s ? (s.rest ? await searchTourIds(db, "es", s.rest, 1000, s.name) : null) : await searchTourIds(db, "es", q));
  return queryCatalog(entries, { search: q, ranked, searchV2: true }, {}).ids;
}
const buscarApagada = (q: string) => queryCatalog(setup().entries, { search: q, ranked: null }, {}).ids;

describe("REQ-122 casos del PO con FTS5 (migración 0011) y bandera encendida", () => {
  it("REQ-122: «Roma» y «Rome» traen solo Roma", async () => {
    expect(await buscarV2("Roma")).toEqual(["R1", "R2", "R3"]);
    expect(await buscarV2("Rome")).toEqual(["R1", "R2", "R3"]);
  });
  it("REQ-122: «Roma tour» trae solo tours de Roma (ni Bucarest ni León ni Florencia)", async () => {
    const ids = await buscarV2("Roma tour");
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((x) => x.startsWith("R"))).toBe(true);
  });
  it("REQ-122: «free tour Roma» trae el free tour de Roma", async () => {
    expect(await buscarV2("free tour Roma")).toEqual(["R1"]);
  });
  it("REQ-122: «tours en Roma» ya encuentra (plural y palabra vacía)", async () => {
    const ids = await buscarV2("tours en Roma");
    expect(ids).toContain("R1");
    expect(ids.every((x) => x.startsWith("R"))).toBe(true);
  });
  it("REQ-122: «Cusco» trae Cusco", async () => {
    expect(await buscarV2("Cusco")).toEqual(["C1"]);
  });
  it("REQ-122: «arte» (sin destino) busca la palabra exacta en todo el catálogo", async () => {
    expect((await buscarV2("arte")).sort()).toEqual(["F1", "R3"]);
  });
});

describe("REQ-122 con la bandera APAGADA nada cambia", () => {
  it("REQ-122: mismos resultados que antes del cambio (REQ-057)", () => {
    expect(buscarApagada("Roma")).toEqual(["R1", "R2", "R3"]);
    expect(buscarApagada("Roma tour")).toEqual(["F2", "R1", "R3"]);
    expect(buscarApagada("free tour Roma")).toEqual(["F2", "R1"]);
    expect(buscarApagada("tours en Roma")).toEqual([]);
    expect(buscarApagada("Rome")).toEqual(["R1", "R2", "R3"]);
    expect(buscarApagada("Cusco")).toEqual(["C1"]);
    expect(buscarApagada("arte")).toEqual(["F1", "R3"]);
  });
});
