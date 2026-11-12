import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSynonyms } from "./lib/synonyms";
import { fold } from "./lib/normalize";
import { taxonomySearchInput, taxonomySynonymsEnabled } from "./lib/taxonomy-terms";
import { DEFAULT_DICTIONARY } from "@/taxonomy/data";

// REQ-1357 (coordinador 7-11, de REQ-1348): los sinónimos del diccionario y los términos fusionados (legado) llegan al
// buscador, tras SEARCH_TAXONOMY_SYNONYMS_ENABLED (apagada; se enciende con OK del PO). Hoy TAXONOMY_TERMS va vacío.
const raw = JSON.parse(readFileSync("data/search-synonyms.json", "utf8"));
const on = taxonomySearchInput(DEFAULT_DICTIONARY, true);
const { map } = buildSynonyms(raw, on.terms, on.legacy);
const alts = (q: string) => map.get(fold(q)) ?? [];

describe("REQ-1357: diccionario → buscador, tras bandera", () => {
  it("REQ-1357: la bandera existe en wrangler.jsonc; apagada, la taxonomía no aporta nada", () => {
    // REQ-1629 la encendió el 11 nov 2026; lo que importa aquí es que exista y que apagada no cambie nada.
    expect(readFileSync("wrangler.jsonc", "utf8")).toMatch(/"SEARCH_TAXONOMY_SYNONYMS_ENABLED":\s*"(true|false)"/);
    expect(taxonomySynonymsEnabled({})).toBe(false);
    expect(taxonomySynonymsEnabled({ SEARCH_TAXONOMY_SYNONYMS_ENABLED: "true" })).toBe(true);
    const off = taxonomySearchInput(DEFAULT_DICTIONARY, false);
    expect(off).toEqual({ terms: [], legacy: [] });
  });
  it("REQ-1357: encendida, los sinónimos de un término activo son equivalentes (free walking tour ↔ Pieza libre)", () => {
    expect(alts("tour a propina")).toContain(fold("free walking tour"));
  });
  it("REQ-1357: los términos fusionados del legado buscan su término nuevo (un sentido)", () => {
    for (const [viejo, nuevo] of [["Hikes", "Montaña y senderismo"], ["Trekks", "Montaña y senderismo"], ["Salud", "Bienestar"], ["Educativo", "Talleres y aprendizaje"], ["Ecoturismo-Cultural", "Naturaleza"], ["Ecoturismo-Cultural", "Cultural e historia"], ["Temática", "Parques y ocio"]] as const) {
      expect(alts(viejo), viejo).toContain(fold(nuevo));
    }
  });
  it("REQ-1357: un legado sin destino (Estético) no se vuelve sinónimo de nada; la marca nunca entra (REQ-171)", () => {
    expect(alts("Estético").length).toBeLessThanOrEqual(1);
    expect([...map.keys()].some((k) => /freetour/.test(k))).toBe(false);
  });
});
