import { describe, expect, it } from "vitest";
import { allTours, destinationTree, findCity } from "./catalog";
import { fx, tour } from "../fixtures/destinos";
import { cityPage, countryPage, destinosPage, sitemapInput, tourPage } from "./page-model";
import { localizeTree } from "./locale";
import { buildSitemaps } from "@/seo/lib/sitemaps";

const site = "https://travelpuzzle.com.mx";
const now = new Date("2026-11-05T12:00:00Z");
const tours = [
  tour(10, 1, { title: "Centro Histórico", titleEn: "Historic Centre" }),
  tour(10, 1, { title: "Coyoacán", titleEn: "" }),
  tour(10, 1, { title: "Xochimilco", titleEn: "Xochimilco boats", price: 30, currency: "EUR" }),
  tour(11, 1, { title: "Monte Albán", titleEn: "Monte Alban" }),
];
const tree = destinationTree({ ...fx, tours, trips: [], now });
const en = localizeTree(tree, "en");
const es = findCity(tree, "mx", "ciudad-de-mexico")!;
const cdmx = findCity(en, "mx", "ciudad-de-mexico")!;
const pick = (c: typeof cdmx, title: string) => allTours(c.city).find((t) => t.title === title)!;

describe("páginas de /destinos por idioma (Gate 3, Ola 2)", () => {
  it("REQ-661/REQ-660: canonical a sí misma y hreflang recíproco con x-default = español", () => {
    const pes = cityPage(es.country, es.city, site, "es").meta;
    const pen = cityPage(cdmx.country, cdmx.city, site, "en").meta;
    expect(pes.canonical).toBe(`${site}/destinos/mx/ciudad-de-mexico`);
    expect(pen.canonical).toBe(`${site}/en/destinos/mx/ciudad-de-mexico`);
    expect(pen.languages).toEqual(pes.languages);
    expect(pen.languages).toEqual({ es: pes.canonical, en: pen.canonical, "x-default": pes.canonical });
    expect(destinosPage(en, site, "en").meta.canonical).toBe(`${site}/en/destinos`);
    expect(countryPage(cdmx.country, site, "en").meta.languages?.["x-default"]).toBe(`${site}/destinos/mx`);
  });

  it("REQ-665: title, description y H1 en el idioma de la URL (mismas plantillas)", () => {
    const p = cityPage(cdmx.country, cdmx.city, site, "en");
    expect(p.h1).toBe("Mexico City");
    expect(p.meta.title).toBe("Free tours in Mexico City: you decide what it's worth | Travel Puzzle");
    expect(p.meta.lang).toBe("en");
    expect(p.crumbs.map((c) => c.name)).toEqual(["Home", "Destinations", "Mexico", "Mexico City"]);
    expect(p.featured?.label).toBe("Featured activities");
    expect(cityPage(es.country, es.city, site, "es").meta.title).toBe("Free tours en Ciudad de México: tú decides cuánto vale | Travel Puzzle");
    const t = tourPage({ country: cdmx.country, city: cdmx.city, tour: pick(cdmx, "Historic Centre"), siteUrl: site, lang: "en" });
    expect(t.meta.title).toBe("Historic Centre – Free tour in Mexico City | Travel Puzzle");
    expect(t.heading.h1).toBe("Historic Centre");
  });

  it("REQ-667/REQ-666: tourPage recibe el idioma de la ruta; el JSON-LD usa ese idioma y su URL canónica", () => {
    const t = tourPage({ country: cdmx.country, city: cdmx.city, tour: pick(cdmx, "Historic Centre"), siteUrl: site, lang: "en" });
    const ld = JSON.stringify(t.jsonLd);
    expect(t.meta.canonical).toBe(`${site}/en${pick(cdmx, "Historic Centre").href}`);
    expect(ld).toContain(`"url":"${t.meta.canonical}"`);
    expect(ld).toContain(`${site}/en/destinos/mx`);
    expect(ld).not.toContain(`"url":"${site}${pick(cdmx, "Historic Centre").href}"`);
    expect(t.enrichment).toBe(false); // FREETOUR C2: sin texto nuevo en ningún idioma
  });

  it("REQ-662: ficha sin título del proveedor en inglés = noindex en /en y fuera del hreflang", () => {
    const t = tourPage({ country: cdmx.country, city: cdmx.city, tour: pick(cdmx, "Coyoacán"), siteUrl: site, lang: "en" });
    expect(t.meta.index).toBe(false);
    expect(t.meta.languages).toBeNull();
    const tes = tourPage({ country: es.country, city: es.city, tour: pick(es, "Coyoacán"), siteUrl: site, lang: "es" });
    expect(tes.meta.index).toBe(true);
    expect(Object.keys(tes.meta.languages!)).toEqual(["es", "x-default"]);
  });

  it("REQ-669: la moneda es la del proveedor en todos los idiomas", () => {
    const off = (lang: "es" | "en", c: typeof cdmx, title: string) => JSON.stringify(tourPage({ country: c.country, city: c.city, tour: pick(c, title), siteUrl: site, lang }).jsonLd).match(/"priceCurrency":"([A-Z]{3})"/)?.[1];
    expect(off("es", es, "Xochimilco")).toBe("EUR");
    expect(off("en", cdmx, "Xochimilco boats")).toBe("EUR");
  });
});

describe("sitemaps por idioma (REQ-663)", () => {
  const { files } = buildSitemaps(sitemapInput(tree, site, { locales: true }));
  const dest = files["sitemap-destinos.xml"];
  const mx = files["sitemap-tours-mx.xml"];

  it("REQ-663: cada <url> indexable en es y en, con xhtml:link recíprocos y x-default", () => {
    expect(dest).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(dest).toContain(`<loc>${site}/en/destinos/mx/ciudad-de-mexico</loc>`);
    const block = (loc: string, xml: string) => xml.split("\n").find((l) => l.includes(`<loc>${loc}</loc>`))!;
    const a = block(`${site}/destinos/mx/ciudad-de-mexico`, dest);
    const b = block(`${site}/en/destinos/mx/ciudad-de-mexico`, dest);
    expect(a.replace(/<loc>.*<\/loc>/, "")).toBe(b.replace(/<loc>.*<\/loc>/, ""));
    expect(a).toContain(`hreflang="x-default" href="${site}/destinos/mx/ciudad-de-mexico"`);
  });

  it("REQ-662/REQ-663: la versión sin texto en inglés no entra; ninguna URL del sitemap es noindex en su idioma", () => {
    const coy = pick(es, "Coyoacán").href;
    expect(mx).toContain(`<loc>${site}${coy}</loc>`);
    expect(mx).not.toContain(`<loc>${site}/en${coy}</loc>`);
    // Contrato: toda URL de ficha en los sitemaps es indexable en su idioma (si una ficha pasa a noindex, sale de todos).
    for (const loc of [...mx.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])) {
      const isEn = loc.startsWith(`${site}/en/`);
      const all = [...allTours(findCity(isEn ? en : tree, "mx", "ciudad-de-mexico")!.city), ...allTours(findCity(isEn ? en : tree, "mx", "oaxaca")!.city)];
      const hit = all.find((x) => loc.endsWith(x.href))!;
      const c = findCity(isEn ? en : tree, "mx", hit.href.split("/")[3])!;
      expect(tourPage({ country: c.country, city: c.city, tour: hit, siteUrl: site, lang: isEn ? "en" : "es" }).meta.index, loc).toBe(true);
    }
  });

  it("REQ-663: sin la bandera, el XML de siempre (sin xhtml ni /en)", () => {
    const off = buildSitemaps(sitemapInput(tree, site)).files;
    expect(off["sitemap-destinos.xml"]).not.toContain("xhtml");
    expect(off["sitemap-destinos.xml"]).not.toContain("/en/");
  });
});
