import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { searchTourIds, rebuildTourSearch, type D1Like } from "./fts-search";

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };

/** Adaptador de node:sqlite con la misma forma que D1 (prepare → bind → all/run). */
function asD1(d: Db): D1Like {
  return { prepare: (sql) => ({ bind: (...v) => ({ all: async () => ({ results: d.prepare(sql).all(...v) as Record<string, unknown>[] }), run: async () => d.prepare(sql).run(...v) }) }) };
}

function seed() {
  const d = new DatabaseSync(":memory:");
  d.exec(`CREATE TABLE "Country"(id INTEGER PRIMARY KEY, code TEXT, translations TEXT);
    CREATE TABLE "City"(id INTEGER PRIMARY KEY, countryId INTEGER, translations TEXT);
    CREATE TABLE "Tour"(id TEXT PRIMARY KEY, cityId INTEGER, countryId INTEGER, isActive BOOLEAN);
    CREATE TABLE "TourTranslation"(id TEXT, tourId TEXT, language TEXT, title TEXT, brief TEXT);`);
  d.exec(readFileSync("migrations/0011_busqueda_fts.sql", "utf8"));
  d.exec(`INSERT INTO Country VALUES (1,'PE','{"es":"Perú","en":"Peru"}'),(2,'FR','{"es":"Francia","en":"France"}');
    INSERT INTO City VALUES (10,1,'{"es":"Cusco","en":"Cuzco"}'),(20,2,'{"es":"París","en":"Paris"}');
    INSERT INTO Tour VALUES ('mp',10,1,1),('free',10,1,1),('par',20,2,1),('old',20,2,0);
    INSERT INTO TourTranslation VALUES ('1','mp','es','Excursión a Machu Picchu','Ciudadela inca'),('2','mp','en','Machu Picchu Day Trip','Inca citadel'),
      ('3','free','es','Free tour por Cusco','Centro histórico'),('4','par','es','Free tour por París','Torre Eiffel y Louvre'),
      ('5','old','es','Tour inactivo por París','No debe salir');`);
  return d;
}

describe("REQ-048 búsqueda FTS5 en D1", () => {
  it("REQ-048: la migración crea el índice y lo llena con los tours activos", async () => {
    const d = seed();
    await rebuildTourSearch(asD1(d));
    const n = d.prepare(`SELECT count(*) n FROM TourSearch`).all() as { n: number }[];
    expect(n[0].n).toBe(4); // sin el inactivo
  });
  it("REQ-048: encuentra sin acentos y por prefijo, y no devuelve inactivos", async () => {
    const d = seed(); await rebuildTourSearch(asD1(d)); const db = asD1(d);
    expect(await searchTourIds(db, "es", "excursion machu")).toEqual(["mp"]);
    expect(await searchTourIds(db, "es", "pari")).toEqual(["par"]);
    expect(await searchTourIds(db, "es", "machu paris")).toEqual([]);
  });
  it("REQ-048: busca nombres de lugar en cualquier idioma (Cuzco/Cusco)", async () => {
    const d = seed(); await rebuildTourSearch(asD1(d)); const db = asD1(d);
    expect((await searchTourIds(db, "es", "cuzco"))?.sort()).toEqual(["free", "mp"]);
  });
  it("REQ-048: texto en inglés en el sitio en español también encuentra el tour, una sola vez", async () => {
    const d = seed(); await rebuildTourSearch(asD1(d)); const db = asD1(d);
    expect(await searchTourIds(db, "es", "day trip")).toEqual(["mp"]);
  });
  it("REQ-048: sin palabras válidas no consulta y devuelve null (el catálogo sigue con su filtro normal)", async () => {
    expect(await searchTourIds(asD1(seed()), "es", " ¿? ")).toBeNull();
  });
});

describe("REQ-122 searchTourIds intenta exacta → prefijo", () => {
  it("REQ-122: si la consulta exacta trae resultados no se prueba el prefijo; si no, sí", async () => {
    const seen: unknown[] = [];
    const db = { prepare: () => ({ bind: (...v: unknown[]) => ({ all: async () => { seen.push(v[0]); return { results: v[0] === '"arte"' ? [] : [{ tourId: "t1" }] }; }, run: async () => null }) }) };
    expect(await searchTourIds(db, "es", "arte")).toEqual(["t1"]);
    expect(seen).toEqual(['"arte"', '"arte"*']);
    seen.length = 0;
    expect(await searchTourIds(db, "es", "tour", 10, "roma")).toEqual(["t1"]);
    expect(seen).toEqual(['"tour" AND place : "roma"']);
  });
});
