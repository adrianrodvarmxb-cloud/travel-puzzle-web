import { describe, expect, it } from "vitest";
import { sitePagesUrls } from "./sitemap";
import { buildSitemaps } from "@/seo/lib/sitemaps";
import { llmsTxt } from "@/seo/lib/robots";

const site = "https://travelpuzzle.com.mx";

describe("sitemap y llms.txt de las páginas nuevas", () => {
  it("REQ-264: sitemap-paginas.xml solo con las páginas encendidas y los artículos publicados", () => {
    expect(sitePagesUrls({ nosotros: false, contacto: false, expertos: false, blog: false }, [], site)).toEqual([]);
    expect(sitePagesUrls({ nosotros: true, contacto: true, expertos: false, blog: true }, [], site).map((u) => u.loc)).toEqual([`${site}/nosotros`, `${site}/contacto`]);
    const blog = [{ loc: `${site}/blog`, lastmod: "2027-01-11" }];
    expect(sitePagesUrls({ nosotros: false, contacto: false, expertos: false, blog: true }, blog, site)).toEqual(blog);
    expect(sitePagesUrls({ nosotros: false, contacto: false, expertos: false, blog: false }, blog, site)).toEqual([]);
  });

  it("REQ-264: el índice suma sitemap-paginas.xml solo cuando hay páginas; sin extra queda igual que hoy", () => {
    const input = { siteUrl: site, countries: [], cities: [], tours: [] };
    expect(buildSitemaps(input).index).not.toContain("sitemap-paginas.xml");
    expect(buildSitemaps(input, [{ loc: `${site}/sitemap-paginas.xml`, lastmod: null }]).index).toContain(`${site}/sitemap-paginas.xml`);
  });

  it("REQ-264: llms.txt lista las páginas encendidas; sin ellas queda igual", () => {
    const base = llmsTxt({ siteUrl: site, destinations: [] });
    expect(llmsTxt({ siteUrl: site, destinations: [], pages: [] })).toBe(base);
    expect(llmsTxt({ siteUrl: site, destinations: [], pages: [{ name: "Nosotros", url: `${site}/nosotros` }] })).toContain(`- [Nosotros](${site}/nosotros)`);
  });
});
