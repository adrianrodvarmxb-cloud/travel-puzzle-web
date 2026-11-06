import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ftsQuery, REBUILD_SQL, SEARCH_SQL } from "./fts-query";

describe("REQ-048 ftsQuery", () => {
  it("REQ-048: cada palabra se busca por prefijo, sin acentos ni mayúsculas", () => {
    expect(ftsQuery("Excursión Machu")).toBe('"excursion"* "machu"*');
  });
  it("REQ-048: quita signos y operadores de FTS para que el texto del usuario nunca rompa la consulta", () => {
    expect(ftsQuery('tour "Lima" OR NEAR(cusco) -* ^')).toBe('"tour"* "lima"* "or"* "near"* "cusco"*');
    expect(ftsQuery("  ¿?  ")).toBeNull();
    expect(ftsQuery("")).toBeNull();
  });
  it("REQ-048: conserva letras de otros alfabetos y números", () => {
    expect(ftsQuery("東京 tour 2026")).toBe('"東京"* "tour"* "2026"*');
  });
  it("REQ-048: máximo 8 palabras", () => {
    expect(ftsQuery("a b c d e f g h i j")?.split(" ")).toHaveLength(8);
  });
  it("REQ-048: el SQL indexa todos los idiomas y prioriza el del visitante", () => {
    expect(REBUILD_SQL.join(" ")).toMatch(/json_each/);
    expect(SEARCH_SQL).toMatch(/MATCH \?1/);
    expect(SEARCH_SQL).toMatch(/"language" = \?2/);
  });
});

describe("REQ-048 migración 0011", () => {
  it("REQ-048: la migración llena el índice con el mismo SQL que el sync diario", () => {
    const sq = (x: string) => x.replace(/\s+/g, " ").trim();
    expect(sq(readFileSync("migrations/0011_busqueda_fts.sql", "utf8"))).toContain(sq(REBUILD_SQL[1]));
  });
});


describe("REQ-048 interruptor y respaldo", () => {
  it("REQ-048: solo se usa con SEARCH_V2_ENABLED=\"true\" y cae a la búsqueda de siempre si no hay resultados", async () => {
    const { isSearchV2, rankedOrFallback } = await import("./fts-query");
    expect(isSearchV2(undefined)).toBe(false);
    expect(isSearchV2("false")).toBe(false);
    expect(isSearchV2("true")).toBe(true);
    expect(rankedOrFallback([])).toBeNull();
    expect(rankedOrFallback(null)).toBeNull();
    expect(rankedOrFallback(["a"])).toEqual(["a"]);
  });
});

// REQ-122 (gates búsqueda 5 nov 2026): palabra exacta primero; prefijo solo en la última palabra o como respaldo.
describe("REQ-122 ftsQueries: exacta primero, prefijo después", () => {
  it("REQ-122: la primera consulta es por palabra exacta; luego prefijo en la última; al final prefijo en todas", async () => {
    const { ftsQueries } = await import("./fts-query");
    expect(ftsQueries("arte")).toEqual(['"arte"', '"arte"*']);
    expect(ftsQueries("free tour")).toEqual(['"free" AND "tour"', '"free" AND "tour"*', '"free"* AND "tour"*']);
  });
  it("REQ-122: plural simple también busca el singular (\"tours\" → \"tour\")", async () => {
    const { ftsQueries } = await import("./fts-query");
    expect(ftsQueries("tours")[0]).toBe('("tours" OR "tour")');
    expect(ftsQueries("museos arte")[0]).toBe('("museos" OR "museo") AND "arte"');
    // palabras cortas o que no son plural simple no se tocan
    expect(ftsQueries("bus")[0]).toBe('"bus"');
    expect(ftsQueries("paris")[0]).toBe('"paris"');
  });
  it("REQ-122: se ignoran las palabras vacías (en, de, la, the…) si queda alguna con contenido", async () => {
    const { ftsQueries } = await import("./fts-query");
    expect(ftsQueries("tours en")[0]).toBe('("tours" OR "tour")');
    expect(ftsQueries("de la")[0]).toBe('"de" AND "la"');
  });
  it("REQ-122: con destino, todas las consultas se limitan a la columna del lugar", async () => {
    const { ftsQueries } = await import("./fts-query");
    expect(ftsQueries("tour", "roma")).toEqual(['"tour" AND place : "roma"', '"tour"* AND place : "roma"']);
    expect(ftsQueries("free", "nueva york")[0]).toBe('"free" AND place : "nueva york"');
  });
  it("REQ-122: sigue siendo segura ante operadores de FTS y texto vacío", async () => {
    const { ftsQueries } = await import("./fts-query");
    expect(ftsQueries('tour "Lima" OR NEAR(')[0]).toBe('"tour" AND "lima" AND "or" AND "near"');
    expect(ftsQueries("  ¿? ")).toEqual([]);
    expect(ftsQueries("roma", '"; DROP')[0]).toBe('"roma" AND place : "drop"');
  });
});
