import { describe, expect, it } from "vitest";
import { footerGuideLinks, guidesIndex } from "./guias-index";
import type { CityGuide } from "./guia";

const base = (pais: string, ciudad: string, nombre: string, en = false): CityGuide => ({
  pais, ciudad, nombre, targetTerm: `guia ${ciudad}`, titulo: `Guía de ${nombre}`, publishedAt: "2026-11-07",
  author: "editorial", origen: "agente-diario", enBreve: "x", sections: [], comoLoSabemos: "IA",
  ...(en ? { en: { nombre: `${nombre} EN`, titulo: `${nombre} guide`, targetTerm: `${ciudad} guide`, enBreve: "x", sections: [], comoLoSabemos: "AI" } } : {}),
} as CityGuide);

const names: Record<string, string> = { cn: "China", in: "India", fr: "Francia", be: "Bélgica" };
const name = (iso: string) => names[iso] ?? iso;

describe("REQ-3333: índice de guías por país", () => {
  const guides = [base("cn", "shanghai", "Shanghái"), base("fr", "paris", "París", true), base("cn", "pekin", "Pekín", true), base("in", "agra", "Agra"), base("be", "brujas", "Brujas")];

  it("REQ-3333: agrupa por país, de más a menos guías y luego por nombre; ciudades en orden alfabético", () => {
    const idx = guidesIndex(guides, "es", name);
    expect(idx.map((c) => c.pais)).toEqual(["cn", "be", "fr", "in"]);
    expect(idx[0]).toMatchObject({ name: "China", count: 2 });
    expect(idx[0].cities.map((c) => c.nombre)).toEqual(["Pekín", "Shanghái"]);
  });

  it("REQ-3333: cada ciudad enlaza a su guía dentro de la página de la ciudad", () => {
    const idx = guidesIndex(guides, "es", name);
    expect(idx[0].cities[0]).toMatchObject({ ciudad: "pekin", href: "/destinos/cn/pekin#guia", titulo: "Guía de Pekín" });
  });

  it("REQ-3333: en inglés solo entran las guías que tienen versión en inglés, con su texto en inglés", () => {
    const idx = guidesIndex(guides, "en", name);
    expect(idx.map((c) => c.pais)).toEqual(["cn", "fr"]);
    expect(idx[0].cities).toEqual([{ ciudad: "pekin", nombre: "Pekín EN", titulo: "Pekín guide", href: "/destinos/cn/pekin#guia" }]);
  });

  it("REQ-3333: sin guías, lista vacía", () => {
    expect(guidesIndex([], "es", name)).toEqual([]);
  });
});

describe("REQ-3335: enlaces de la columna «Guías» del pie (gate A3)", () => {
  const many = ["cn", "in", "pe", "co", "np", "fr", "be", "jp", "mx"].map((p, i) => base(p, `c${i}`, `C${i}`));

  it("REQ-3335: «Todas las guías» primero y hasta 8 países con ancla", () => {
    const links = footerGuideLinks(guidesIndex(many, "es", name), "es");
    expect(links[0]).toEqual({ href: "/guias", label: "Todas las guías" });
    expect(links).toHaveLength(9);
    expect(links[1]).toEqual({ href: "/guias#be", label: "Bélgica" });
  });

  it("REQ-3335: en inglés dice «All guides»", () => {
    expect(footerGuideLinks(guidesIndex([base("cn", "pekin", "Pekín", true)], "en", name), "en")[0]).toEqual({ href: "/guias", label: "All guides" });
  });

  it("REQ-3335: sin guías en el idioma, sin enlaces (la columna no sale)", () => {
    expect(footerGuideLinks([], "en")).toEqual([]);
  });
});

describe("REQ-3334: página /guias", () => {
  it("REQ-3334: title, descripción y canonical en español; hreflang es/en cuando hay guías en inglés", async () => {
    const { guidesPageMeta } = await import("./guias-index");
    const m = guidesPageMeta({ lang: "es", siteUrl: "https://travelpuzzle.com.mx", langs: ["es", "en"] });
    expect(m).toMatchObject({ title: "Guías de ciudad · Travel Puzzle", canonical: "https://travelpuzzle.com.mx/guias", index: true, lang: "es" });
    expect(m.languages).toMatchObject({ es: "https://travelpuzzle.com.mx/guias", en: "https://travelpuzzle.com.mx/en/guias" });
  });

  it("REQ-3334: en inglés, título en inglés y canonical /en/guias", async () => {
    const { guidesPageMeta } = await import("./guias-index");
    const m = guidesPageMeta({ lang: "en", siteUrl: "https://travelpuzzle.com.mx", langs: ["es", "en"] });
    expect(m).toMatchObject({ title: "City guides · Travel Puzzle", canonical: "https://travelpuzzle.com.mx/en/guias", index: true });
  });

  it("REQ-3334: idiomas de la página: los que tienen al menos una guía", async () => {
    const { guidesLangs } = await import("./guias-index");
    expect(guidesLangs([base("cn", "pekin", "Pekín", true)])).toEqual(["es", "en"]);
    expect(guidesLangs([base("cn", "pekin", "Pekín")])).toEqual(["es"]);
    expect(guidesLangs([])).toEqual([]);
  });
});

describe("REQ-3334: /guias en sitemap-paginas.xml", () => {
  it("REQ-3334: con guías, una entrada /guias con la fecha de la guía más reciente; sin guías, nada", async () => {
    const { guidesSitemapUrls } = await import("./guias-index");
    const g2 = { ...base("in", "agra", "Agra"), publishedAt: "2026-11-08" } as CityGuide;
    expect(guidesSitemapUrls([base("cn", "pekin", "Pekín"), g2], "https://travelpuzzle.com.mx/")).toEqual([{ loc: "https://travelpuzzle.com.mx/guias", lastmod: "2026-11-08" }]);
    expect(guidesSitemapUrls([], "https://travelpuzzle.com.mx")).toEqual([]);
  });
});
