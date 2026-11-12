import { describe, expect, it } from "vitest";
import { inlineLinks } from "@/blog/lib/inline";
import { guideEnProblems, guideKey } from "./lib/guia";
import { loadGuides, GUIDES_RAW } from "./guias";

const internal = (texts: string[]) => new Set(texts.flatMap((t) => inlineLinks(t)).map((l) => l.href.split(/[?#]/)[0]).filter((h) => h.startsWith("/")));
const textsOf = (g: { enBreve: string; sections: { answer: string; body: string[]; list?: string[] }[] }) => [g.enBreve, ...g.sections.flatMap((s) => [s.answer, ...s.body, ...(s.list ?? [])])];

describe("REQ-3340: versión en inglés de las guías ya publicadas (gate C1)", () => {
  const guides = loadGuides(GUIDES_RAW, () => {});

  it("REQ-3340: ninguna guía del repo se descarta al cargar", () => {
    expect(guides).toHaveLength(GUIDES_RAW.length);
  });

  it("REQ-3340: cada guía del repo tiene su versión en inglés y pasa las reglas en inglés", () => {
    const bad = guides.flatMap((g) => {
      const known = internal(textsOf(g));
      const p = guideEnProblems(g, { existing: guides, knownPaths: known });
      return p.map((x) => `${guideKey(g)}: ${x}`);
    });
    expect(bad).toEqual([]);
  });

  it("REQ-3340: la versión en inglés solo enlaza a las mismas páginas del sitio que la española", () => {
    const extra = guides.flatMap((g) => {
      if (!g.en) return [];
      const es = internal(textsOf(g));
      return [...internal(textsOf(g.en))].filter((h) => !es.has(h)).map((h) => `${guideKey(g)}: ${h}`);
    });
    expect(extra).toEqual([]);
  });
});
