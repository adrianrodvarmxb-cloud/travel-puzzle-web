import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { taxonomySynonymsEnabled } from "./lib/taxonomy-terms";

describe("REQ-1629: sinónimos del diccionario encendidos en producción (REQ-430, REQ-1357)", () => {
  const wrangler = readFileSync("wrangler.jsonc", "utf8");
  it("REQ-1629: wrangler.jsonc enciende SEARCH_TAXONOMY_SYNONYMS_ENABLED", () => {
    expect(wrangler).toMatch(/"SEARCH_TAXONOMY_SYNONYMS_ENABLED": "true"/);
  });
  it("REQ-1629: su requisito, SEARCH_STEM_ENABLED, sigue encendido", () => {
    expect(wrangler).toMatch(/"SEARCH_STEM_ENABLED": "true"/);
    expect(taxonomySynonymsEnabled({ SEARCH_TAXONOMY_SYNONYMS_ENABLED: "true" })).toBe(true);
  });
  it("REQ-1629: la prueba de humo busca con un sinónimo del diccionario («trekking»)", () => {
    const pages = JSON.parse(readFileSync("tests/smoke/pages.json", "utf8"));
    expect(JSON.stringify(pages)).toContain("/tours?search=trekking");
  });
});
