import { describe, it, expect } from "vitest";
import { buildSitemaps, urlsetXml } from "./sitemaps";

const site = "https://travelpuzzle.com.mx";
const input = {
  siteUrl: site,
  countries: [
    { slug: "peru", indexable: true },
    { slug: "china", indexable: false },
  ],
  cities: [
    { countrySlug: "peru", slug: "lima", indexable: true, guideUpdatedAt: "2026-10-01T00:00:00Z" },
    { countrySlug: "peru", slug: "ica", indexable: false, guideUpdatedAt: null },
    { countrySlug: "china", slug: "pekin", indexable: false, guideUpdatedAt: null },
  ],
  tours: [
    { countrySlug: "peru", citySlug: "lima", slug: "centro", status: "active" as const, contentUpdatedAt: "2026-10-20T10:00:00Z", lastSeenAt: "2026-11-05T09:00:00Z" },
    { countrySlug: "peru", citySlug: "lima", slug: "barranco", status: "missing" as const, contentUpdatedAt: "2026-09-01T10:00:00Z" },
    { countrySlug: "peru", citySlug: "lima", slug: "viejo", status: "removed" as const, contentUpdatedAt: "2026-11-04T10:00:00Z" },
    { countrySlug: "peru", citySlug: "ica", slug: "dunas", status: "active" as const, contentUpdatedAt: "2026-10-02T10:00:00Z" },
    { countrySlug: "peru", citySlug: "lima", slug: null, status: "active" as const, contentUpdatedAt: "2026-10-02T10:00:00Z", title: "sin-slug" },
  ],
};

describe("REQ-102: sitemaps por país con lastmod real", () => {
  const out = buildSitemaps(input);

  it("REQ-102: el índice lista sitemap-destinos.xml y un sitemap-tours-{pais}.xml por país con tours indexables", () => {
    expect(Object.keys(out.files).sort()).toEqual(["sitemap-destinos.xml", "sitemap-tours-peru.xml"]);
    expect(out.index).toContain(`<loc>${site}/sitemap-destinos.xml</loc>`);
    expect(out.index).toContain(`<loc>${site}/sitemap-tours-peru.xml</loc>`);
    expect(out.index).not.toContain("china");
    expect(out.index.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(out.index).toContain("<sitemapindex");
  });
  it("REQ-102: destinos: hubs, países y ciudades indexables; nada en noindex", () => {
    const d = out.files["sitemap-destinos.xml"];
    expect(d).toContain(`<loc>${site}/la-primera-pieza</loc>`);
    expect(d).toContain(`<loc>${site}/destinos</loc>`);
    expect(d).toContain(`<loc>${site}/destinos/peru</loc>`);
    expect(d).toContain(`<loc>${site}/destinos/peru/lima</loc>`);
    expect(d).not.toContain("/destinos/peru/ica");
    expect(d).not.toContain("/destinos/china");
  });
  it("REQ-102: tours: solo canónicas que responden 200 (sin removed, sin ciudad en noindex, sin slug)", () => {
    const t = out.files["sitemap-tours-peru.xml"];
    expect(t).toContain(`${site}/destinos/peru/lima/centro`);
    expect(t).toContain(`${site}/destinos/peru/lima/barranco`);
    expect(t).not.toContain("viejo");
    expect(t).not.toContain("dunas");
    expect(t).not.toContain("sin-slug");
  });
  it("REQ-102: lastmod = último cambio real del contenido, nunca la fecha del sync", () => {
    const t = out.files["sitemap-tours-peru.xml"];
    expect(t).toContain(`<loc>${site}/destinos/peru/lima/centro</loc><lastmod>2026-10-20</lastmod>`);
    expect(t).not.toContain("2026-11-05");
    const d = out.files["sitemap-destinos.xml"];
    // la ciudad toma el cambio más reciente de sus tours publicados o de su guía; el tour removido no cuenta
    expect(d).toContain(`<loc>${site}/destinos/peru/lima</loc><lastmod>2026-10-20</lastmod>`);
    expect(d).not.toContain("2026-11-04");
    expect(out.index).toContain(`<loc>${site}/sitemap-tours-peru.xml</loc><lastmod>2026-10-20</lastmod>`);
  });
  it("REQ-102: escapa caracteres especiales en las URLs", () => {
    expect(urlsetXml([{ loc: "https://t.mx/a?b=1&c=2", lastmod: null }])).toContain("<loc>https://t.mx/a?b=1&amp;c=2</loc>");
  });
});
