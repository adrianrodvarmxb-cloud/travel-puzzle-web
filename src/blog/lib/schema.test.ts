import { describe, expect, it } from "vitest";
import { parsePost, wordCount } from "./schema";
import { samplePost } from "./fixtures";

describe("esquema del artículo (14 bloques)", () => {
  it("REQ-253: un artículo publicable completo pasa", () => {
    expect(parsePost(samplePost()).ok).toBe(true);
  });

  it("REQ-253: sin H1, sin pilar, sin término objetivo o con «En breve» fuera de 40 a 80 palabras no pasa", () => {
    for (const bad of [{ title: "" }, { pillar: "marte" }, { targetTerm: "" }, { enBreve: "Muy corto." }, { enBreve: "palabra ".repeat(81) }]) {
      expect(parsePost(samplePost(bad)).ok, JSON.stringify(bad).slice(0, 40)).toBe(false);
    }
  });

  it("REQ-253: pide de 4 a 8 H2 y cada uno abre con su respuesta", () => {
    const s = samplePost().sections;
    expect(parsePost(samplePost({ sections: s.slice(0, 3) })).ok).toBe(false);
    expect(parsePost(samplePost({ sections: [...s, ...s, ...s].slice(0, 9) })).ok).toBe(false);
    expect(parsePost(samplePost({ sections: s.map((x) => ({ ...x, answer: "" })) })).ok).toBe(false);
  });

  it("REQ-254: un artículo con hueco [PO: …] no se puede publicar; como borrador sí se acepta", () => {
    const gap = samplePost({ entrada: "[PO: entrada con el dolor del viajero]" });
    expect(parsePost(gap).ok).toBe(false);
    expect(parsePost({ ...gap, draft: true }).ok).toBe(true);
  });

  it("REQ-254: un dato con fuente exige URL https y fecha de verificación", () => {
    const d = samplePost().datos![0];
    expect(parsePost(samplePost({ datos: [{ ...d, source: { ...d.source, url: "http://x.mx" } }] })).ok).toBe(false);
    expect(parsePost(samplePost({ datos: [{ ...d, checkedAt: "ayer" }] })).ok).toBe(false);
  });

  it("REQ-254: el minicaso ilustrativo se rotula; máximo 2 citas y 4 preguntas frecuentes", () => {
    const p = samplePost();
    expect(parsePost(samplePost({ citas: [p.citas![0], p.citas![0], p.citas![0]] })).ok).toBe(false);
    expect(parsePost(samplePost({ faq: Array(5).fill(p.faq![0]) })).ok).toBe(false);
  });

  it("wordCount cuenta palabras separadas por espacios", () => {
    expect(wordCount("  hola   mundo, ¿qué tal?  ")).toBe(4);
  });
});
