import { describe, it, expect } from "vitest";
import { catalogName, catalogTitle } from "./catalog-name";
import { withPrimeraPiezaLinks } from "./menu";
import { withTransfersLink } from "@/transfers/lib/nav";
import { translations } from "@/lib/translations";
import { homeCopy } from "@/home/lib/copy";
import { llmsTxt } from "@/seo/lib/robots";
import { tripCopy } from "@/trips/lib/copy";
import { groupLabel } from "./extra-filters";

const LANGS = ["es", "en", "pt", "de", "fr", "it"] as const;
const menu = (lang: (typeof LANGS)[number], pp: boolean, showPP = false) => {
  const t = translations[lang];
  return withPrimeraPiezaLinks(withTransfersLink([
    { href: "/", label: t["nav.home"] },
    { href: "/tours", label: t["nav.tours"] },
    { href: "/#como-funciona", label: t["nav.howItWorks"] },
  ], true, t["nav.transfers"]), pp, lang, showPP);
};

describe("REQ-174: «Experiencias» reemplaza a «Tours» en el menú, el H1 y el title de /tours (G1 firmado, 6 nov 2026)", () => {
  it("REQ-174: nombre del catálogo por idioma", () => {
    expect(catalogName("es")).toBe("Experiencias");
    expect(catalogName("en")).toBe("Experiences");
    expect(catalogName("xx")).toBe("Experiences");
  });

  it("REQ-174: menú de hoy: Inicio · Experiencias · Traslados · Cómo Funciona (la URL sigue siendo /tours)", () => {
    expect(menu("es", false).map((l) => l.label)).toEqual(["Inicio", "Experiencias", "Traslados", "Cómo Funciona"]);
    expect(menu("es", false).map((l) => l.href)).toEqual(["/", "/tours", "/traslados", "/#como-funciona"]);
  });

  it("REQ-174 + REQ-600: con La Primera Pieza encendida: Inicio · Destinos · Experiencias · Traslados · Cómo Funciona", () => {
    expect(menu("es", true).map((l) => l.label)).toEqual(["Inicio", "Destinos", "Experiencias", "Traslados", "Cómo Funciona"]);
    // Reversible (MENU_PRIMERA_PIEZA = true): vuelve el orden de REQ-174.
    expect(menu("es", true, true).map((l) => l.label)).toEqual(["Inicio", "La Primera Pieza", "Destinos", "Experiencias", "Traslados", "Cómo Funciona"]);
  });

  it.each(LANGS)("REQ-174 (sitelinks): en %s el menú (escritorio y celular), el H1 y el title de /tours dicen lo mismo", (lang) => {
    const t = translations[lang];
    expect(t["nav.tours"]).toBe(catalogName(lang));
    expect(t["tours.headline"]).toBe(catalogName(lang));
    expect(catalogTitle(lang)).toBe(`${catalogName(lang)} | Travel Puzzle`);
  });

  it("REQ-174: el footer y llms.txt nombran la sección como el menú", () => {
    expect(homeCopy("es").footerTours).toBe("Experiencias");
    expect(homeCopy("en").footerTours).toBe("Experiences");
    const l = llmsTxt({ siteUrl: "https://t.mx", destinations: [] });
    expect(l).toContain("- [Experiencias](https://t.mx/tours): buscador de experiencias.");
    expect(l).not.toContain("[Tours]");
  });

  it("REQ-174: «Tours» sigue como formato dentro de Experiencias: chips y filtros no cambian", () => {
    expect(tripCopy("es").filterTour).toBe("Tours");
    expect(tripCopy("en").filterTour).toBe("Tours");
    expect(groupLabel("visitas", "es")).toBe("Visitas guiadas y Pieza libre"); // REQ-271 (PO 6-11): la categoría se llama «Pieza libre»; «Tours» no cambia
  });

  it("REQ-174 (PO, 06:22): el chip de formato de viajes únicos se llama «Momentos de autor» y ya no repite «Experiencias»", () => {
    expect(tripCopy("es").filterExp).toBe("Momentos de autor");
    expect(tripCopy("en").filterExp).toBe("Signature moments");
    for (const lang of LANGS) expect(tripCopy(lang).filterExp).not.toBe(catalogName(lang));
  });
});
