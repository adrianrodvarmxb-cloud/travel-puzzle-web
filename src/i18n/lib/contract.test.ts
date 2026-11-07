import { describe, expect, it } from "vitest";
import { hreflangContractFailures, parseLocaleHead } from "./contract";

const site = "https://travelpuzzle.com.mx";
const head = (o: { lang: string; canonical: string; alts?: Record<string, string>; noindex?: boolean }) =>
  `<!DOCTYPE html><html lang="${o.lang}"><head><link rel="canonical" href="${site}${o.canonical}"/>${o.noindex ? '<meta name="robots" content="noindex, follow"/>' : ""}${Object.entries(o.alts ?? {}).map(([l, p]) => `<link rel="alternate" hrefLang="${l}" href="${site}${p}"/>`).join("")}</head><body></body></html>`;
const set = { es: "/destinos/mx", en: "/en/destinos/mx", "x-default": "/destinos/mx" };

describe("contrato hreflang/canonical (REQ-676)", () => {
  it("REQ-676: lee lang, canonical, robots y alternates del <head> crudo", () => {
    expect(parseLocaleHead(head({ lang: "en", canonical: "/en/destinos/mx", alts: set }))).toEqual({ lang: "en", canonical: "/en/destinos/mx", noindex: false, alternates: set });
  });

  it("REQ-676: lee también los metadatos transmitidos al final del <body> (streaming de Next 15)", () => {
    const streamed = head({ lang: "es", canonical: "/destinos/mx", alts: set }).replace(/<head>(.*)<\/head><body>/, "<head></head><body><div hidden>$1</div>");
    expect(parseLocaleHead(streamed)).toEqual({ lang: "es", canonical: "/destinos/mx", noindex: false, alternates: set });
  });

  it("REQ-676: un par recíproco con x-default pasa", () => {
    expect(hreflangContractFailures({ "/destinos/mx": head({ lang: "es", canonical: "/destinos/mx", alts: set }), "/en/destinos/mx": head({ lang: "en", canonical: "/en/destinos/mx", alts: set }) })).toEqual([]);
  });

  it("REQ-676: falla si el hreflang no es recíproco", () => {
    const f = hreflangContractFailures({ "/destinos/mx": head({ lang: "es", canonical: "/destinos/mx", alts: set }), "/en/destinos/mx": head({ lang: "en", canonical: "/en/destinos/mx", alts: { en: "/en/destinos/mx", "x-default": "/destinos/mx" } }) });
    expect(f.join("\n")).toMatch(/\/destinos\/mx.*no es recíproco/);
  });

  it("REQ-676: falla si el canonical apunta a otro idioma o a otra página, o si <html lang> no es el de la URL", () => {
    const f = hreflangContractFailures({ "/en/destinos/mx": head({ lang: "es", canonical: "/destinos/mx", alts: set }), "/destinos/mx": head({ lang: "es", canonical: "/destinos/mx", alts: set }) });
    expect(f.join("\n")).toMatch(/\/en\/destinos\/mx: canonical de otro idioma/);
    expect(f.join("\n")).toMatch(/\/en\/destinos\/mx: <html lang="es">/);
  });

  it("REQ-676: falla si una indexable no tiene hreflang, si le falta x-default o si no se lista a sí misma", () => {
    expect(hreflangContractFailures({ "/en": head({ lang: "en", canonical: "/en" }) }).join()).toMatch(/sin hreflang/);
    const noX = { es: "/destinos/mx", en: "/en/destinos/mx" };
    expect(hreflangContractFailures({ "/destinos/mx": head({ lang: "es", canonical: "/destinos/mx", alts: noX }) }).join()).toMatch(/x-default/);
    expect(hreflangContractFailures({ "/destinos/mx": head({ lang: "es", canonical: "/destinos/mx", alts: { en: "/en/destinos/mx", "x-default": "/destinos/mx" } }) }).join()).toMatch(/no se lista/);
  });

  it("REQ-662/REQ-676: una noindex no debe llevar hreflang; sin hreflang está bien", () => {
    expect(hreflangContractFailures({ "/en/destinos/mx/cdmx/t": head({ lang: "en", canonical: "/en/destinos/mx/cdmx/t", noindex: true }) })).toEqual([]);
    expect(hreflangContractFailures({ "/en/destinos/mx/cdmx/t": head({ lang: "en", canonical: "/en/destinos/mx/cdmx/t", noindex: true, alts: set }) }).join()).toMatch(/noindex con hreflang/);
  });

  it("REQ-676: la home en inglés acepta /en/ y /en como la misma página; una alterna sin HTML se reporta", () => {
    const h = { es: "/", en: "/en", "x-default": "/" };
    expect(hreflangContractFailures({ "/en/": head({ lang: "en", canonical: "/en", alts: h }), "/": head({ lang: "es", canonical: "/", alts: h }) })).toEqual([]);
    expect(hreflangContractFailures({ "/": head({ lang: "es", canonical: "/", alts: h }) }).join()).toMatch(/\/en.*no se pudo verificar/);
  });
});
