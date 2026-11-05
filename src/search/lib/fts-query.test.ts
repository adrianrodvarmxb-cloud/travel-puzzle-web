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
