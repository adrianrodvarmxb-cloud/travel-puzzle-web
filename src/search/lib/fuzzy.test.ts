import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildFuzzyDict, resolveFuzzy, type FuzzySource } from "./fuzzy";
import { buildCuratedArtifact, curatedFromArtifact, parseAliases } from "./aliases";

const raw = JSON.parse(readFileSync(path.join(process.cwd(), "data", "search-aliases.json"), "utf8"));
const curated = curatedFromArtifact(buildCuratedArtifact(raw));

const city = (names: string[], text: string, n = 1): FuzzySource[] =>
  Array.from({ length: n }, () => ({ text, cityNames: names, countryNames: [] }));
// Catálogo de prueba: nombres como los guarda toEntry (normalizados) y textos de tours.
const entries: FuzzySource[] = [
  ...city(["roma", "rome"], "free tour roma coliseo y foro romano", 5),
  ...city(["rumania"], "castillos de rumania dracula"),
  ...city(["barcelona"], "free tour barcelona gotico sagrada familia", 4),
  ...city(["machu picchu"], "excursion a machu picchu desde cusco", 2),
  ...city(["cusco"], "free tour cusco plaza de armas", 3),
  ...city(["bari"], "free tour bari vecchia"),
  ...city(["parma", "parme"], "tour del parmesano en parma"),
  ...city(["palma", "palma de mallorca"], "free tour palma catedral"),
  ...city(["nueva york", "new york"], "free tour nueva york manhattan", 3),
  ...city(["ciudad de mexico", "mexico city"], "free tour centro historico", 2),
  ...city(["estambul", "istanbul"], "free tour estambul santa sofia"),
  ...city(["goreme"], "globo en goreme"),
  ...city(["lima"], "free tour lima centro"),
  ...city(["lyon"], "free tour lyon vieux"),
  ...city(["malaga"], "free tour malaga alcazaba"),
  ...city(["malaya"], "tour por malaya"),
];
const dict = buildFuzzyDict(entries);
const r = (q: string) => resolveFuzzy(q, dict, curated);

describe("REQ-284 alias curados (data/search-aliases.json)", () => {
  it("el archivo es válido: sin filas descartadas ni alias repetidos", () => {
    const c = parseAliases(raw);
    expect(c.rejected).toBe(0);
    expect(c.aliases.size).toBeGreaterThanOrEqual(10);
    for (const n of ["bali", "bari", "lima", "lyon", "cuba", "cebu", "niza", "ibiza"]) expect(c.noCorrect.has(n)).toBe(true);
  });
  it("una fila inválida se descarta y no tumba el resto", () => {
    const c = parseAliases({ version: 1, aliases: [{ alias: "cuzco", to: ["cusco"], note: "ok" }, { alias: "", to: [] }], noCorrect: [] });
    expect(c.aliases.size).toBe(1);
    expect(c.rejected).toBe(1);
  });
  it("un archivo con otra forma no se usa (sin alias, sin error)", () => {
    expect(parseAliases({ nope: true }).aliases.size).toBe(0);
  });
  it("«Cuzco» → Cusco", () => {
    expect(r("Cuzco")).toEqual({ text: "cusco", changes: [{ from: "cuzco", to: "cusco", kind: "alias" }], suggestions: [] });
  });
  it("«CDMX», «NY» y «Estambul»", () => {
    expect(r("tours CDMX").text).toBe("tours ciudad de mexico");
    expect(r("free tour NY").text).toBe("free tour nueva york");
    expect(r("Estambul").changes).toEqual([]); // ya es un nombre del catálogo: nada que cambiar
    expect(r("Istambul").text).toBe("estambul");
  });
  it("un alias cuyo destino no está en el catálogo no hace nada", () => {
    expect(r("Bombay").changes).toEqual([]);
  });
  it("alias con errata se corrige con el índice curado del build («Capadosia» → Göreme)", () => {
    expect(r("Capadosia").text).toBe("goreme");
  });
});

describe("REQ-285 tests mínimos del informe (6 nov 2026)", () => {
  it("«Roma» ≠ Rumania (palabra exacta primero)", () => {
    expect(r("Roma")).toEqual({ text: "Roma", changes: [], suggestions: [] });
  });
  it("«Barselona» → Barcelona", () => {
    expect(r("Barselona").text).toBe("barcelona");
    expect(r("Barselona").changes[0]).toEqual({ from: "barselona", to: "barcelona", kind: "typo" });
  });
  it("«Machu Pichu» → Machu Picchu", () => {
    expect(r("Machu Pichu").text).toBe("machu picchu");
  });
  it("«Rma» → sugerencia «¿Quisiste decir Roma?», nunca filtro", () => {
    const x = r("Rma");
    expect(x.changes).toEqual([]);
    expect(x.text).toBe("Rma");
    expect(x.suggestions).toEqual([{ from: "rma", options: ["roma"] }]);
  });
  it("«Bari» ≠ Bali y «Bali» (no está) no se vuelve Bari", () => {
    expect(r("Bari")).toEqual({ text: "Bari", changes: [], suggestions: [] });
    expect(r("Bali")).toEqual({ text: "Bali", changes: [], suggestions: [] });
  });
  it("un nombre de la lista que choca solo sale como sugerencia («Bary» → ¿Bari?)", () => {
    const x = r("Bary");
    expect(x.changes).toEqual([]);
    expect(x.suggestions[0].options).toContain("bari");
  });
  it("sin margen sobre el segundo no se corrige: «Malaxa» → ¿Málaga o Malaya?", () => {
    const x = r("Malaxa");
    expect(x.changes).toEqual([]);
    expect(x.suggestions[0].options.sort()).toEqual(["malaga", "malaya"]);
  });
  it("dos nombres de la lista que chocan a la misma distancia: solo sugerencia («Pasma»)", () => {
    const x = r("Pasma");
    expect(x.changes).toEqual([]);
    expect(x.suggestions[0].options.sort()).toEqual(["palma", "parma"]);
  });
});

describe("REQ-285 orden de resolución y lo que NO se corrige", () => {
  it("con el destino exacto en el texto no se toca nada más", () => {
    expect(r("Roma tour").changes).toEqual([]);
    expect(r("tours en Roma").text).toBe("tours en Roma");
  });
  it("la última palabra que es inicio de otra conocida se está escribiendo: no se corrige («Barcel»)", () => {
    expect(r("Barcel")).toEqual({ text: "Barcel", changes: [], suggestions: [] });
  });
  it("palabras del catálogo no son erratas («coliseo», «dracula»)", () => {
    expect(r("coliseo").changes).toEqual([]);
    expect(r("dracula").changes).toEqual([]);
  });
  it("errata dentro de una frase: se corrige solo el destino y el resto se conserva", () => {
    expect(r("free tour Barselona").text).toBe("free tour barcelona");
  });
  it("error en la primera letra cuenta doble: «Varcelona» (1+1 = 2) sí, «Varselona» (2+1) y «Pari» (1+1 > 1) no", () => {
    expect(r("Varcelona").text).toBe("barcelona"); // 9 letras: hasta 2
    expect(r("Varselona").changes).toEqual([]);
    expect(r("Pari").changes).toEqual([]);
  });
  it("transposición «Rmoa» = 1 errata → Roma", () => {
    expect(r("Rmoa").text).toBe("roma");
  });
  it("texto vacío", () => {
    expect(r("   ")).toEqual({ text: "", changes: [], suggestions: [] });
  });
  it("determinista: mismo texto, mismo resultado", () => {
    expect(JSON.stringify(r("Barselona"))).toBe(JSON.stringify(r("Barselona")));
  });
});
