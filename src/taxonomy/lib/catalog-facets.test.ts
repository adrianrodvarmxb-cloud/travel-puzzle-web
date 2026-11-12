import { describe, it, expect } from "vitest";
import { catalogClassifier, catalogFacets } from "./publish";
import { DEFAULT_DICTIONARY, DEFAULT_MAPPINGS } from "../data";

const cls = catalogClassifier(DEFAULT_DICTIONARY, DEFAULT_MAPPINGS);

describe("REQ-1421 / REQ-1422: temas y atributos de cada producto del índice", () => {
  it("REQ-1421: el clasificador del catálogo da los temas (solo los del filtro)", () => {
    const f = catalogFacets(cls({ categoryId: 5, price: 40, durationMinutes: 180, title: "Food tour: tapas and wine", cities: ["Madrid"] }));
    expect(f.temas).toContain("gastronomia");
    expect(f.temas).not.toContain("urbano");
  });
  it("REQ-1422: cómo te mueves, nocturno y en español salen con dato", () => {
    const f = catalogFacets(cls({ categoryId: 12, price: 0, durationMinutes: 120, title: "Night walking tour of the old town", cities: ["Prague"], languages: ["es", "en"] }));
    expect(f.atributos).toEqual(expect.arrayContaining(["a-pie", "nocturno", "idioma-es"]));
    expect(f.atributos.every((a) => !a.startsWith("medio:"))).toBe(true);
  });
  it("REQ-1422: sin idioma español declarado no sale «En español»", () => {
    const f = catalogFacets(cls({ categoryId: 12, price: 0, durationMinutes: 120, title: "Old town tour", cities: ["Prague"], languages: ["en"] }));
    expect(f.atributos).not.toContain("idioma-es");
  });
});
