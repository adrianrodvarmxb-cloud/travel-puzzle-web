import { describe, expect, it } from "vitest";
import { normalizeTerm, termSimilarity, termConflicts, TERM_SIMILARITY_MAX } from "./terms";

describe("canibalización de términos", () => {
  it("REQ-970: normaliza acentos, mayúsculas, artículos y plurales", () => {
    expect(normalizeTerm("Excursiones de un día desde Sevilla")).toEqual(["excursion", "dia", "desde", "sevilla"]);
    expect(normalizeTerm("Tour a pie por París")).toEqual(["tour", "pie", "paris"]);
  });

  it("REQ-970: igual o casi igual (Jaccard ≥ 0.75) es conflicto; otra ciudad no", () => {
    expect(TERM_SIMILARITY_MAX).toBe(0.75);
    expect(termSimilarity("free tour en lima", "Free tours en Lima")).toBe(1);
    expect(termSimilarity("excursiones de un dia desde sevilla", "excursiones de un dia desde praga")).toBeLessThan(0.75);
    const others = [{ term: "excursion a la gran muralla desde pekin", label: "CN-02" }, { term: "free tour en lima", label: "FT-PE-01" }];
    expect(termConflicts("excursiones a la gran muralla desde pekín", others)).toEqual(["CN-02"]);
    expect(termConflicts("tours guiados en budapest", others)).toEqual([]);
  });
});
