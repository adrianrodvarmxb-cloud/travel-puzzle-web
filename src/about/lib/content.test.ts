import { describe, expect, it } from "vitest";
import { aboutContent, visibleAboutSections, ABOUT_SECTIONS, hasPendingGap, agencyFacts, aboutSectionsToShow } from "./content";
import { PROHIBIDAS_SITIO, textsOf } from "@/site/lib/vocab";

describe("contenido de /nosotros", () => {
  it("REQ-243: H1 «Nosotros» (igual que el enlace del pie) y description ≤155", () => {
    expect(aboutContent("es").h1).toBe("Nosotros");
    expect(aboutContent("en").h1).toBe("About us");
    expect(aboutContent("es").meta.description.length).toBeLessThanOrEqual(155);
  });

  it("REQ-243: un bloque pendiente o con hueco [PO: …] no se pinta", () => {
    const c = aboutContent("es");
    const visible = visibleAboutSections(c).map((s) => s.id);
    // Lo que falta del cliente (historia, misión y visión, frase, equipo) sigue en borrador.
    expect(visible).not.toContain("historia");
    expect(visible).not.toContain("proposito");
    expect(visible).not.toContain("frase");
    expect(visible).not.toContain("equipo");
    expect(visible).toContain("como-trabajamos");
    for (const s of visibleAboutSections(c)) expect(hasPendingGap(s), s.id).toBe(false);
  });

  it("REQ-243: aunque se marque «aprobado», un bloque con [PO: …] sigue oculto", () => {
    const c = aboutContent("es");
    const forced = { ...c, sections: c.sections.map((s) => ({ ...s, status: "aprobado" as const })) };
    const ids = visibleAboutSections(forced).map((s) => s.id);
    expect(ids).not.toContain("historia");
    expect(ids).not.toContain("equipo");
  });

  it("REQ-243: los huecos del borrador están marcados [PO: …] (nada se rellena)", () => {
    const historia = aboutContent("es").sections.find((s) => s.id === "historia")!;
    expect(hasPendingGap(historia)).toBe(true);
  });

  it("REQ-3497: /nosotros no muestra la sección de cifras (oculta, reversible) en es ni en en", () => {
    for (const lang of ["es", "en"] as const) {
      const v = visibleAboutSections(aboutContent(lang));
      expect(v.map((s) => s.id)).not.toContain("cifras");
      expect(aboutContent(lang).sections.some((s) => s.id === "cifras")).toBe(true);
    }
  });

  it("REQ-244: sin vocabulario prohibido, sin FREETOUR ni proveedores, sin «expertos» ni garantías (es y en)", () => {
    for (const lang of ["es", "en"]) {
      const all = textsOf(visibleAboutSections(aboutContent(lang))).concat(textsOf(aboutContent(lang).meta), aboutContent(lang).lead);
      expect(all.filter((t) => PROHIBIDAS_SITIO.test(t)), lang).toEqual([]);
    }
  });

  it("REQ-243: los datos de la agencia salen del texto vigente de /terminos (fuente única), sin domicilio", () => {
    expect(agencyFacts()).toEqual({ holder: "Claudia Leticia Rodríguez Laveaga", rnt: "04100050179", profeco: "6635-2023" });
    expect(agencyFacts("texto sin datos")).toEqual({ holder: null, rnt: null, profeco: null });
    const agencia = aboutContent("es").sections.find((s) => s.id === "agencia")!;
    expect(JSON.stringify(agencia)).not.toMatch(/Lázaro|Cárdenas|Esperanza|34080/);
  });

  it("REQ-243 (D8): sin cifras del catálogo, «Hoy en el sitio» no sale ni con su título", () => {
    // REQ-3497 ocultó «cifras»; la regla de REQ-243 se sigue probando con la sección forzada a aprobada.
    const c = aboutContent("es");
    const v = c.sections.map((s) => ({ ...s, status: "aprobado" as const })).filter((s) => s.kind === "stats");
    expect(aboutSectionsToShow(v, null).map((s) => s.id)).not.toContain("cifras");
    expect(aboutSectionsToShow(v, { tours: 0, cities: 0, countries: 0, rating: null }).map((s) => s.id)).not.toContain("cifras");
    expect(aboutSectionsToShow(v, { tours: 5, cities: 0, countries: 0, rating: null }).map((s) => s.id)).toContain("cifras");
  });

  it("REQ-244: todas las secciones declaradas tienen id único", () => {
    const ids = aboutContent("es").sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual([...ABOUT_SECTIONS].sort());
  });
});
