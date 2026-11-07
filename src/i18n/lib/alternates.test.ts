import { describe, expect, it } from "vitest";
import { hubAlternates, INDEXABLE_LOCALES, localeAlternates, localizedUrl } from "./alternates";

const site = "https://travelpuzzle.com.mx";

describe("localeAlternates", () => {
  it("REQ-660/REQ-661: canonical a sí misma, hreflang de todas sus versiones y x-default = español", () => {
    const es = localeAlternates({ siteUrl: site, path: "/destinos/mx", lang: "es", langs: ["es", "en"] });
    const en = localeAlternates({ siteUrl: site, path: "/destinos/mx", lang: "en", langs: ["es", "en"] });
    expect(es.canonical).toBe(`${site}/destinos/mx`);
    expect(en.canonical).toBe(`${site}/en/destinos/mx`);
    const set = { es: `${site}/destinos/mx`, en: `${site}/en/destinos/mx`, "x-default": `${site}/destinos/mx` };
    expect(es.languages).toEqual(set);
    expect(en.languages).toEqual(set);
    expect(es.index && en.index).toBe(true);
  });

  it("REQ-660: home en inglés sin barra final; x-default a la raíz", () => {
    const a = localeAlternates({ siteUrl: site, path: "/", lang: "en", langs: ["es", "en"] });
    expect(a.canonical).toBe(`${site}/en`);
    expect(a.languages?.["x-default"]).toBe(`${site}/`);
  });

  it("REQ-662: una versión sin texto propio es noindex, sin hreflang, con canonical propio", () => {
    const a = localeAlternates({ siteUrl: site, path: "/destinos/mx/cdmx/t", lang: "en", langs: ["es"] });
    expect(a).toEqual({ canonical: `${site}/en/destinos/mx/cdmx/t`, index: false, languages: null });
    const b = localeAlternates({ siteUrl: site, path: "/destinos/mx/cdmx/t", lang: "es", langs: ["es"] });
    expect(b.index).toBe(true);
    expect(b.languages).toEqual({ es: `${site}/destinos/mx/cdmx/t`, "x-default": `${site}/destinos/mx/cdmx/t` });
  });

  it("REQ-662: v1 solo indexa es y en; pt/fr/it/de quedan noindex aunque tengan texto", () => {
    expect(INDEXABLE_LOCALES).toEqual(["es", "en"]);
    const a = localeAlternates({ siteUrl: site, path: "/tours", lang: "pt", langs: ["es", "en", "pt", "fr"] });
    expect(a.index).toBe(false);
    expect(a.languages).toBeNull();
    expect(Object.keys(localeAlternates({ siteUrl: site, path: "/tours", lang: "es", langs: ["es", "en", "pt"] }).languages!)).toEqual(["es", "en", "x-default"]);
  });

  it("REQ-661: localizedUrl quita la query", () => {
    expect(localizedUrl(site, "/tours?formato=x", "en")).toBe(`${site}/en/tours`);
  });
});

describe("hubAlternates", () => {
  it("REQ-670: /en/tours con filtro = noindex, canonical a /en/tours y sin hreflang", () => {
    expect(hubAlternates({ siteUrl: site, path: "/tours", lang: "en", filtered: true })).toEqual({ canonical: `${site}/en/tours`, index: false });
  });
  it("REQ-660: /tours sin filtro = hreflang es/en + x-default; pt queda noindex", () => {
    const a = hubAlternates({ siteUrl: site, path: "/tours", lang: "es" });
    expect(a).toEqual({ canonical: `${site}/tours`, index: true, languages: { es: `${site}/tours`, en: `${site}/en/tours`, "x-default": `${site}/tours` } });
    expect(hubAlternates({ siteUrl: site, path: "/traslados", lang: "pt" }).index).toBe(false);
  });
});
