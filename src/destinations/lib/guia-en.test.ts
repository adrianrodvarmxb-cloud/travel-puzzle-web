import { describe, expect, it } from "vitest";
import { guideIn, guideLangs, guideProblems, parseGuide, type GuideCtx } from "./guia";
import { sampleGuide, sampleGuideEn, w } from "../fixtures/guias";

const ctx = (o: Partial<GuideCtx> = {}): GuideCtx => ({
  today: "2026-11-07", existing: [], knownPaths: new Set(["/destinos/fr/paris"]), otherTerms: [], ...o,
});
const problems = (o: Record<string, unknown> = {}, c: Partial<GuideCtx> = {}) => { const r = guideProblems(sampleGuide(o), ctx(c)); return r.ok ? [] : r.problems; };
const en = (o: Record<string, unknown>) => ({ en: sampleGuideEn(o) });

describe("REQ-3336: guías bilingües (gate B2)", () => {
  it("REQ-3336: la guía con su versión en inglés pasa el validador", () => {
    expect(problems()).toEqual([]);
  });

  it("REQ-3336: una guía nueva sin versión en inglés no pasa", () => {
    expect(problems({ en: undefined })).toContain("falta la versión en inglés (en)");
  });

  it("REQ-3336: la versión en inglés cumple las mismas reglas: 300 palabras, «In short» de 40 a 80, mismas secciones, 2 fuentes, AI", () => {
    const short = sampleGuideEn().sections.map((s) => ({ ...s, body: [] }));
    expect(problems(en({ sections: short })).join(" ")).toMatch(/inglés: la guía necesita 300 palabras o más/);
    expect(problems(en({ enBreve: w(10, "text") })).join(" ")).toMatch(/inglés: «In short» debe tener de 40 a 80 palabras/);
    expect(problems(en({ sections: sampleGuideEn().sections.slice(0, 2).concat([{ ...sampleGuideEn().sections[2] }, { h2: "Extra?", answer: w(10, "text"), body: [] }]) })).join(" ")).toMatch(/inglés: debe tener las mismas 3 secciones/);
    const oneSource = sampleGuideEn().sections.map((s, i) => (i === 2 ? { ...s, answer: "Book ahead." } : s));
    expect(problems(en({ sections: oneSource })).join(" ")).toMatch(/inglés: la guía necesita 2 fuentes externas/);
    expect(problems(en({ comoLoSabemos: "Written by our team after interviews." })).join(" ")).toMatch(/inglés: «How we know» debe decir que se usó AI/);
  });

  it("REQ-3336: en inglés también se prohíbe «FREETOUR»", () => {
    expect(problems(en({ enBreve: `${w(44, "text")} FREETOUR` })).join(" ")).toMatch(/inglés: vocabulario prohibido: «FREETOUR»/);
  });

  it("REQ-3336: guideIn da la guía en el idioma pedido, o null si no existe en ese idioma", () => {
    const g = parseGuide(sampleGuide());
    if (!g.ok) throw new Error(g.error);
    expect(guideLangs(g.guide)).toEqual(["es", "en"]);
    expect(guideIn(g.guide, "es")?.titulo).toBe("Guía de París para tu primer viaje");
    expect(guideIn(g.guide, "en")).toMatchObject({ lang: "en", titulo: "Paris guide for your first trip", pais: "fr", ciudad: "paris", publishedAt: "2026-11-07" });
    const onlyEs = parseGuide(sampleGuide({ en: undefined }));
    if (!onlyEs.ok) throw new Error(onlyEs.error);
    expect(guideLangs(onlyEs.guide)).toEqual(["es"]);
    expect(guideIn(onlyEs.guide, "en")).toBeNull();
    expect(guideIn(onlyEs.guide, "fr")).toBeNull();
  });
});

describe("REQ-3336: la guía en inglés también cuenta para indexar en inglés", () => {
  it("REQ-3336: overlayGuides deja el texto plano en inglés en la ciudad (guideEn)", async () => {
    const { overlayGuides, guidePlain } = await import("./guia");
    const g = parseGuide(sampleGuide());
    if (!g.ok) throw new Error(g.error);
    const [c] = overlayGuides([{ id: 1, iso2: "FR" }], [{ id: 9, countryId: 1, slug: "paris", guide: null as string | null, guideUpdatedAt: null as string | null, guideEn: null as string | null }], [g.guide]);
    expect(c.guideEn).toBe(guidePlain(g.guide.en!));
    const onlyEs = parseGuide(sampleGuide({ en: undefined }));
    if (!onlyEs.ok) throw new Error(onlyEs.error);
    const [d] = overlayGuides([{ id: 1, iso2: "FR" }], [{ id: 9, countryId: 1, slug: "paris", guide: null as string | null, guideUpdatedAt: null as string | null, guideEn: null as string | null }], [onlyEs.guide]);
    expect(d.guideEn ?? null).toBeNull();
  });

  it("REQ-3336: una ciudad con 1 tour y guía en inglés indexa en es y en; sin guía en inglés, solo en es", async () => {
    const { cityLangs } = await import("./locale");
    const { guidePlain } = await import("./guia");
    const g = parseGuide(sampleGuide());
    if (!g.ok) throw new Error(g.error);
    const country = { indexable: true } as Parameters<typeof cityLangs>[1];
    const city = { indexed: true, activeTours: 1, indexableTours: 1, guide: guidePlain(g.guide) } as Parameters<typeof cityLangs>[0];
    expect(cityLangs({ ...city, guideEn: guidePlain(g.guide.en!) }, country)).toEqual(["es", "en"]);
    expect(cityLangs(city, country)).toEqual(["es"]);
  });
});
