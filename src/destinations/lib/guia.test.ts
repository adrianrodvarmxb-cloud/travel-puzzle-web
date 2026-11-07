import { describe, expect, it } from "vitest";
import { parseGuide, guidePlain, guideProblems, overlayGuides, nextGuideCities, guideKey, guideSmokePaths, GUIDE_MIN_WORDS_REPO, GUIDES_PER_DAY, type GuideCtx } from "./guia";
import { wordCount, cityMeetsRule } from "./indexing";
import { sampleGuide, w } from "../fixtures/guias";

const ctx = (o: Partial<GuideCtx> = {}): GuideCtx => ({
  today: "2026-11-07",
  existing: [],
  knownPaths: new Set(["/destinos/fr/paris", "/destinos/cn/pekin", "/tours"]),
  otherTerms: [{ term: "free tour en paris en español", label: "FT-EU-01" }],
  ...o,
});
const problems = (o: Record<string, unknown> = {}, c: Partial<GuideCtx> = {}) => { const r = guideProblems(sampleGuide(o), ctx(c)); return r.ok ? [] : r.problems; };

describe("guías propias de ciudad", () => {
  it("REQ-1220 + REQ-1222: la guía de ejemplo (plantilla del blog adaptada a ciudad) pasa y su texto plano cumple la regla de indexación (300 palabras o más)", () => {
    expect(GUIDE_MIN_WORDS_REPO).toBe(300);
    expect(problems()).toEqual([]);
    const g = parseGuide(sampleGuide());
    if (!g.ok) throw new Error(g.error);
    expect(wordCount(guidePlain(g.guide))).toBeGreaterThanOrEqual(300);
    expect(cityMeetsRule({ activeTours: 1, guide: guidePlain(g.guide) })).toBe(true);
    expect(guidePlain(g.guide)).not.toMatch(/\]\(|https?:\/\//);
  });

  it("REQ-1223: rechaza menos de 300 palabras, sin 2 fuentes externas de dominios distintos, o cifras y requisitos sin enlace", () => {
    const short = sampleGuide().sections.map((s) => ({ ...s, body: [] }));
    expect(problems({ sections: short }).join(" ")).toMatch(/300 palabras o más/);
    const oneSource = sampleGuide().sections.map((s, i) => (i === 2 ? { ...s, answer: "Reserva con tiempo." } : s));
    expect(problems({ sections: oneSource }).join(" ")).toMatch(/2 fuentes externas de dominios distintos/);
    const noLink = [...sampleGuide().sections, { h2: "¿Cuánto cuesta?", answer: "Cuesta 20 euros.", body: [] }];
    expect(problems({ sections: noLink }).join(" ")).toMatch(/cifra o afirmación sin fuente enlazada en sections\[3\]\.answer/);
  });

  it("REQ-1224: rechaza «FREETOUR», vocabulario prohibido, experiencia inventada y texto copiado de la página de la ciudad (C2)", () => {
    expect(problems({ enBreve: `${w(44)} FREETOUR` }).join(" ")).toMatch(/vocabulario prohibido/);
    expect(problems({ enBreve: `${w(43)} los expertos` }).join(" ")).toMatch(/vocabulario prohibido/);
    expect(problems({ enBreve: `${w(42)} nuestros clientes` }).join(" ")).toMatch(/vocabulario del blog diario/);
    const city = `Recorrido a pie por el centro con un guía local que te cuenta la historia de cada plaza y de cada iglesia del barrio`;
    const copied = [{ h2: "¿Copia?", answer: `Un ${city} con calma.`, body: [] }, ...sampleGuide().sections];
    expect(problems({ sections: copied }, { cityText: city }).join(" ")).toMatch(/C2: texto copiado de la página de la ciudad/);
  });

  it("REQ-1225: enlaces internos que responden; la ciudad existe; una guía por ciudad", () => {
    const broken = [...sampleGuide().sections.slice(0, 2), { ...sampleGuide().sections[2], body: [w(80), "Ve a [otra](/destinos/xx/nada)."] }];
    expect(problems({ sections: broken })).toContain("enlace que no resuelve: /destinos/xx/nada");
    expect(problems({ pais: "xx", ciudad: "nada" })).toContain("la ciudad /destinos/xx/nada no tiene página publicada");
    const prev = parseGuide(sampleGuide({ publishedAt: "2026-11-06", targetTerm: "otra guia" }));
    if (!prev.ok) throw new Error(prev.error);
    expect(problems({}, { existing: [prev.guide] })).toContain("la ciudad fr/paris ya tiene guía");
  });

  it("REQ-1226: no duplica el término de los artículos del blog, de sus pilares ni de otras guías", () => {
    expect(problems({ targetTerm: "free tours en París en español" }).join(" ")).toMatch(/término repetido o casi igual: FT-EU-01/);
  });

  // REQ-1236 reemplaza la parte «2 por día» de REQ-1227 (PO, 7 nov 2026, 07:50: «de 2 a 5 por día», opción B).
  it("REQ-1236 (reemplaza a REQ-1227): fecha real, autor editorial y máximo 5 guías por día", () => {
    expect(GUIDES_PER_DAY).toBe(5);
    expect(problems({ publishedAt: "2026-11-06" })).toContain("publishedAt debe ser la fecha de hoy (2026-11-07)");
    expect(problems({ author: "claudia" }).join(" ")).toMatch(/author/);
    const g = (c: string) => { const r = parseGuide(sampleGuide({ ciudad: c, targetTerm: `guia ${c}` })); if (!r.ok) throw new Error(r.error); return r.guide; };
    const cuatro = ["lyon", "niza", "lille", "nantes"].map(g);
    expect(problems({ ciudad: "pekin", pais: "cn", targetTerm: "guia pekin" }, { existing: cuatro })).toEqual([]);
    expect(problems({ ciudad: "pekin", pais: "cn", targetTerm: "guia pekin" }, { existing: [...cuatro, g("burdeos")] })).toContain("ya hay 5 guías publicadas el 2026-11-07");
  });

  it("REQ-1228: la guía del repo se superpone al campo `guide` de la ciudad (por país ISO-2 y slug), sin tocar D1", () => {
    const r = parseGuide(sampleGuide());
    if (!r.ok) throw new Error(r.error);
    expect(guideKey(r.guide)).toBe("fr/paris");
    const countries = [{ id: 1, iso2: "FR" }, { id: 2, iso2: "CN" }];
    const cities = [
      { id: 10, countryId: 1, slug: "paris", guide: null, guideUpdatedAt: null },
      { id: 11, countryId: 1, slug: "lyon", guide: "guía de D1", guideUpdatedAt: "2026-01-01T00:00:00Z" },
      { id: 20, countryId: 2, slug: "paris", guide: null, guideUpdatedAt: null },
    ];
    const out = overlayGuides(countries, cities, [r.guide]);
    expect(out[0]).toMatchObject({ guide: guidePlain(r.guide), guideUpdatedAt: "2026-11-07T00:00:00.000Z" });
    expect(out[1]).toEqual(cities[1]);
    expect(out[2]).toEqual(cities[2]);
  });

  it("REQ-1229: orden de la tarea diaria — primero las 37 con viaje propio, luego por número de experiencias, 2 por día", () => {
    const order = ["fr/paris", "cn/pekin", "cn/shanghai"];
    const r = parseGuide(sampleGuide());
    if (!r.ok) throw new Error(r.error);
    expect(nextGuideCities({ order, byExperiences: ["es/sevilla", "fr/paris", "gb/londres"], existing: [r.guide], n: 2 })).toEqual(["cn/pekin", "cn/shanghai"]);
    expect(nextGuideCities({ order: [], byExperiences: ["es/sevilla", "fr/paris", "gb/londres"], existing: [r.guide], n: 2 })).toEqual(["es/sevilla", "gb/londres"]);
  });

  it("REQ-1231 + REQ-1236: el humo prueba las páginas de ciudad de las guías más recientes (hasta 5)", () => {
    const g = (c: string, d: string) => { const r = parseGuide(sampleGuide({ ciudad: c, targetTerm: `guia ${c}`, publishedAt: d })); if (!r.ok) throw new Error(r.error); return r.guide; };
    expect(guideSmokePaths([g("a", "2026-11-05"), g("b", "2026-11-07"), g("c", "2026-11-06")])).toEqual(["/destinos/fr/b", "/destinos/fr/c", "/destinos/fr/a"]);
    const seis = ["a", "b", "c", "d", "e", "f"].map((c, i) => g(c, `2026-11-0${i + 1}`));
    expect(guideSmokePaths(seis)).toEqual(["/destinos/fr/f", "/destinos/fr/e", "/destinos/fr/d", "/destinos/fr/c", "/destinos/fr/b"]);
  });
});
