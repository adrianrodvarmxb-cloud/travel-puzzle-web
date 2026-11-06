import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  aliasCsv, aliasSql, baseLang, buildAliasRows, coverage, parseAlternateName, parseWikidataAliases, toAscii, wikidataAliasQuery,
} from "./alias-ingest";
import { mergeDbAliases } from "./db-aliases";
import { buildFuzzyDict, resolveFuzzy } from "./fuzzy";
import { buildCuratedArtifact, curatedFromArtifact } from "./aliases";

const require_ = createRequire(import.meta.url);
type Stmt = { run: (...p: unknown[]) => unknown; all: (...p: unknown[]) => unknown[] };
type Db = { exec: (sql: string) => void; prepare: (sql: string) => Stmt };
const { DatabaseSync } = require_("node:sqlite") as { DatabaseSync: new (path: string) => Db };
const MIGRATION = readFileSync(path.join(process.cwd(), "docs", "migraciones-propuestas", "0018_destino_alias.sql"), "utf8");

// Líneas con la forma real de alternateNamesV2.txt (Roma = 3169070, Ciudad de México = 3530597)
const L = (id: number, gn: number, lang: string, name: string, pref = "", short = "", coll = "", hist = "") => [id, gn, lang, name, pref, short, coll, hist, "", ""].join("\t");
const LINES = [
  L(1, 3169070, "cs", "Řím", "1"), L(2, 3169070, "ru", "Рим", "1"), L(3, 3169070, "zh", "罗马", "1"), L(4, 3169070, "en", "Rome", "1"),
  L(5, 3169070, "el", "Ρώμη", "1"), L(6, 3169070, "la", "Roma"), L(7, 3169070, "iata", "ROM"), L(8, 3169070, "link", "https://en.wikipedia.org/wiki/Rome"),
  L(9, 3169070, "it", "Città eterna", "", "", "1"), L(10, 3169070, "ja", "ローマ"), L(11, 3530597, "es", "México D. F.", "", "", "", "1"),
  L(12, 3530597, "en", "Mexico City", "1"), L(13, 99999, "es", "No está en el catálogo"), "línea rota",
];
const CITIES = [{ cityId: 2527, countryId: 105, geonameid: 3169070 }, { cityId: 2938, countryId: 99, geonameid: 3530597 }];
const parsed = LINES.map(parseAlternateName).filter((x): x is NonNullable<typeof x> => !!x);
const rows = buildAliasRows(CITIES, parsed);

describe("REQ-350 lectura de GeoNames y Wikidata", () => {
  it("solo los 14 idiomas útiles; fuera códigos no lingüísticos (iata, link…) y latín", () => {
    expect(parsed.map((p) => p.lang)).toEqual(["cs", "ru", "zh", "en", "el", "it", "ja", "es", "en", "es"]);
    expect(baseLang("zh-Hans")).toBe("zh");
    expect(baseLang("pt-BR")).toBe("pt");
    for (const c of ["post", "iata", "icao", "link", "wkdt", "la", ""]) expect(baseLang(c)).toBeNull();
  });
  it("tipo y peso: preferido > nombre > corto > coloquial > histórico", () => {
    expect(parseAlternateName(L(1, 1, "it", "Città eterna", "", "", "1"))!.type).toBe("coloquial");
    expect(parseAlternateName(L(1, 1, "es", "México D. F.", "", "", "", "1"))!.type).toBe("historico");
    expect(parseAlternateName(L(1, 1, "es", "Roma", "1"))!.type).toBe("preferido");
  });
  it("Wikidata: consulta por P1566 y lectura de la respuesta (zh-hant → zh)", () => {
    const q = wikidataAliasQuery([3169070, 3169070]);
    expect(q).toContain("wdt:P1566");
    expect(q.match(/"3169070"/g)!.length).toBe(1);
    const w = parseWikidataAliases({ results: { bindings: [
      { gn: { value: "3169070" }, label: { value: "羅馬", "xml:lang": "zh-hant" } },
      { gn: { value: "x" }, label: { value: "?", "xml:lang": "es" } },
    ] } });
    expect(w).toEqual([{ geonameid: 3169070, lang: "zh", name: "羅馬", type: "wikidata", fuente: "wikidata" }]);
    expect(parseWikidataAliases(null)).toEqual([]);
  });
});

describe("REQ-351 normalización en la ingesta", () => {
  it("plegado y transliteración: Řím → rim, Рим → rim, Ρώμη → romi; CJK igual", () => {
    expect(toAscii("Řím")).toBe("rim");
    expect(toAscii("Рим")).toBe("rim");
    expect(toAscii("Ρώμη")).toBe("romi");
    expect(toAscii("Москва")).toBe("moskva");
    expect(toAscii("罗马")).toBe("罗马");
  });
  it("solo ciudades del catálogo por geonameid, una fila por (ciudad, idioma, plegado)", () => {
    expect(rows.every((r) => [2527, 2938].includes(r.cityId))).toBe(true);
    expect(rows.find((r) => r.alias === "Рим")).toMatchObject({ aliasPlegado: "рим", aliasAscii: "rim", idioma: "ru", tipo: "preferido", peso: 100 });
    const dup = buildAliasRows(CITIES, [...parsed, { geonameid: 3169070, lang: "ru", name: "РИМ", type: "nombre" }]);
    expect(dup.filter((r) => r.idioma === "ru")).toHaveLength(1);
  });
});

describe("REQ-352 CSV y SQL (solo archivos) contra la migración propuesta", () => {
  it("el SQL generado entra en la tabla propuesta y es idempotente", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(MIGRATION);
    const sql = aliasSql(rows);
    expect(sql).toContain("NO APLICAR sin OK del PO");
    db.exec(sql);
    db.exec(sql);
    expect(db.prepare(`SELECT COUNT(*) AS n FROM "destino_alias"`).all()).toEqual([{ n: rows.length }]);
    expect(db.prepare(`SELECT "city_id" FROM "destino_alias" WHERE "alias_ascii" = 'rim' AND "idioma" = 'ru'`).all()).toEqual([{ city_id: 2527 }]);
  });
  it("CSV con encabezado y comillas cuando hace falta", () => {
    const csv = aliasCsv([{ ...rows[0], alias: 'Roma, "la eterna"' }]);
    expect(csv.split("\n")[0]).toBe("geonameid,city_id,country_id,idioma,alias,alias_plegado,alias_ascii,tipo,peso,fuente");
    expect(csv).toContain('"Roma, ""la eterna"""');
  });
  it("la migración propuesta NO está en migrations/", () => {
    expect(readdirSync(path.join(process.cwd(), "migrations")).some((f) => /destino_alias/.test(f))).toBe(false);
  });
});

describe("REQ-353 cobertura por idioma", () => {
  it("cuenta ciudades con al menos un alias por idioma", () => {
    const c = coverage(rows, 2);
    expect(c.ru).toEqual({ cities: 1, pct: 50 });
    expect(c.en).toEqual({ cities: 2, pct: 100 });
    expect(c.ko).toEqual({ cities: 0, pct: 0 });
  });
});

describe("REQ-354 «Řím», «Рим», «罗马» → Roma (con destino_alias)", () => {
  const entries = [
    { cityId: 2527, text: "free tour roma coliseo", cityNames: ["roma", "rome"], countryNames: ["italia"] },
    { cityId: 2938, text: "free tour centro historico", cityNames: ["ciudad de mexico", "mexico city"], countryNames: ["mexico"] },
    { cityId: 3000, text: "free tour rimini", cityNames: ["rimini"], countryNames: ["italia"] },
  ];
  const dict = buildFuzzyDict(entries);
  const curated = curatedFromArtifact(buildCuratedArtifact(JSON.parse(readFileSync(path.join(process.cwd(), "data", "search-aliases.json"), "utf8"))));
  const dbRows = rows.map((r) => ({ city_id: r.cityId, alias_plegado: r.aliasPlegado, alias_ascii: r.aliasAscii }));
  const { aliases, used } = mergeDbAliases(curated, dbRows, entries);
  it("sin la tabla, nada cambia", () => {
    expect(resolveFuzzy("Рим", dict, curated).text).toBe("Рим");
  });
  it("con la tabla: Řím, Рим, 罗马, Ρώμη y ローマ resuelven a Roma", () => {
    expect(used).toBeGreaterThan(0);
    for (const q of ["Řím", "Рим", "罗马", "Ρώμη", "ローマ", "tours en Рим"]) expect(resolveFuzzy(q, dict, aliases).text).toMatch(/roma$/);
  });
  it("un alias igual al nombre de otro destino del catálogo no se usa; los ambiguos y los inválidos tampoco", () => {
    const m = mergeDbAliases(curated, [
      { city_id: 2527, alias_plegado: "rimini", alias_ascii: "rimini" }, // es otro destino
      { city_id: 2527, alias_plegado: "eterna", alias_ascii: "eterna" }, { city_id: 2938, alias_plegado: "eterna", alias_ascii: "eterna" }, // ambiguo
      { city_id: "x", alias_plegado: 1 }, // inválido
      { city_id: 2527, alias_plegado: "ro", alias_ascii: "ro" }, // muy corto
    ], entries);
    expect(m.aliases.aliases.has("rimini")).toBe(false);
    expect(m.aliases.aliases.has("eterna")).toBe(false);
    expect(m.aliases.aliases.has("ro")).toBe(false);
    expect(resolveFuzzy("rimini", dict, m.aliases).text).toBe("rimini");
  });
  it("el alias curado gana sobre el de la tabla", () => {
    const m = mergeDbAliases(curated, [{ city_id: 2938, alias_plegado: "cuzco", alias_ascii: "cuzco" }], entries);
    expect(m.aliases.aliases.get("cuzco")).toEqual(["cusco"]);
  });
});

describe("REQ-351/354 casos del ensayo real (GeoNames, 6 nov 2026)", () => {
  it("«罗马市» también genera «罗马» (sin 市) con un poco menos de peso", () => {
    const r = buildAliasRows([{ cityId: 2527, countryId: 75, geonameid: 3169070 }], [{ geonameid: 3169070, lang: "zh", name: "罗马市", type: "nombre" }]);
    expect(r.map((x) => [x.alias, x.peso])).toEqual([["罗马市", 60], ["罗马", 55]]);
  });
  it("un alias no parte un destino exacto de varias palabras («Den Haag»)", () => {
    const entries = [
      { cityId: 1, text: "free tour la haya", cityNames: ["la haya", "den haag", "the hague"], countryNames: [] },
      { cityId: 2, text: "tour amsterdam", cityNames: ["amsterdam"], countryNames: [] },
    ];
    const dict = buildFuzzyDict(entries);
    const cur = curatedFromArtifact(buildCuratedArtifact(JSON.parse(readFileSync(path.join(process.cwd(), "data", "search-aliases.json"), "utf8"))));
    const m = mergeDbAliases(cur, [{ city_id: 1, alias_plegado: "haag", alias_ascii: "haag" }], entries);
    expect(resolveFuzzy("Den Haag", dict, m.aliases).text).toBe("Den Haag");
    expect(resolveFuzzy("Haag", dict, m.aliases).text).toBe("la haya");
  });
  it("un alias de una palabra que aparece en títulos de otra ciudad no se usa («lion» de Lyon vs. «Lion King» en Londres)", () => {
    const entries = [
      { cityId: 1, text: "free tour lyon", cityNames: ["lyon"], countryNames: [] },
      { cityId: 2, text: "musical lion king londres", cityNames: ["londres"], countryNames: [] },
    ];
    const cur = curatedFromArtifact(buildCuratedArtifact(JSON.parse(readFileSync(path.join(process.cwd(), "data", "search-aliases.json"), "utf8"))));
    const m = mergeDbAliases(cur, [{ city_id: 1, alias_plegado: "lion", alias_ascii: "lion" }, { city_id: 1, alias_plegado: "lugdunum", alias_ascii: "lugdunum" }], entries);
    expect(m.aliases.aliases.has("lion")).toBe(false);
    expect(m.aliases.aliases.get("lugdunum")).toEqual(["lyon"]);
  });
});
