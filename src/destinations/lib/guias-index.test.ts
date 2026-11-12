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
