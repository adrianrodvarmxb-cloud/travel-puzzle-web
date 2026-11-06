import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import generated from "./data/search-index.generated.json";
import { buildCuratedArtifact } from "./lib/aliases";
import { fuzzyDictFor, fuzzySearch, isSearchFuzzy } from "./fuzzy";
import { queryCatalog, splitDestination, type CatalogEntry } from "@/catalog/lib/query";

const e = (id: string, cityId: number, cityNames: string[], text: string): CatalogEntry => ({
  id, cityId, countryId: 1, categoryId: null, price: 0, rating: 5, reviews: 10, durationMinutes: 120,
  createdAt: 0, updatedAt: 0, text, cityNames, countryNames: ["pais"],
});
const entries = [
  e("R1", 1, ["roma", "rome"], "free tour roma coliseo"),
  e("B1", 2, ["barcelona"], "free tour barcelona gotico"),
  e("C1", 3, ["cusco"], "free tour cusco"),
  e("M1", 4, ["machu picchu"], "excursion machu picchu"),
];

describe("REQ-282 índice curado generado en el build", () => {
  it("el archivo versionado es exactamente lo que genera data/search-aliases.json (correr `npm run search:index`)", () => {
    const raw = JSON.parse(readFileSync(path.join(process.cwd(), "data", "search-aliases.json"), "utf8"));
    expect(JSON.parse(JSON.stringify(buildCuratedArtifact(raw)))).toEqual(generated);
  });
  it("package.json lo regenera antes de cada build (prebuild)", () => {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    expect(pkg.scripts.prebuild).toBe("tsx src/scripts/search-index.ts");
  });
});

describe("REQ-285 SEARCH_FUZZY_ENABLED", () => {
  it("solo «true» la enciende; en wrangler.jsonc está en «false»", () => {
    expect(isSearchFuzzy("true")).toBe(true);
    for (const v of [undefined, "", "false", "TRUE", "1"]) expect(isSearchFuzzy(v)).toBe(false);
    expect(readFileSync(path.join(process.cwd(), "wrangler.jsonc"), "utf8")).toMatch(/"SEARCH_FUZZY_ENABLED": "false"/);
  });
  it("con la bandera APAGADA nada cambia: no hay resultado y se busca el texto de la URL", () => {
    for (const q of ["Cuzco", "Barselona", "Rma", "Roma", "Machu Pichu"]) expect(fuzzySearch(entries, q, false)).toBeNull();
  });
  it("encendida: «Barselona» filtra a Barcelona y «Cuzco» a Cusco (de punta a punta con splitDestination)", () => {
    for (const [q, id] of [["Barselona", "B1"], ["Cuzco", "C1"], ["Machu Pichu", "M1"], ["free tour Barselona", "B1"]] as const) {
      const text = fuzzySearch(entries, q, true)!.text;
      expect(splitDestination(entries, text)).not.toBeNull();
      expect(queryCatalog(entries, { search: text, searchV2: true }, {}).ids).toEqual([id]);
    }
  });
  it("encendida: «Rma» no filtra (solo sugerencia) y «Roma» sigue igual", () => {
    expect(fuzzySearch(entries, "Rma", true)).toMatchObject({ text: "Rma", changes: [], suggestions: [{ options: ["roma"] }] });
    expect(fuzzySearch(entries, "Roma", true)!.text).toBe("Roma");
  });
  it("texto vacío: nada que resolver", () => {
    expect(fuzzySearch(entries, "  ", true)).toBeNull();
    expect(fuzzySearch(entries, undefined, true)).toBeNull();
  });
  it("el índice del catálogo se arma una vez por catálogo (también si la caché devuelve una copia)", () => {
    const a = fuzzyDictFor(entries);
    expect(fuzzyDictFor(entries)).toBe(a);
    expect(fuzzyDictFor(entries.map((x) => ({ ...x })))).toBe(a);
  });
});
