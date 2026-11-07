import { describe, expect, it } from "vitest";
import { buildSitemaps } from "./sitemaps";
import { viajesSitemapTrips } from "./sitemaps-viajes";

const site = "https://travelpuzzle.com.mx";
const base = { siteUrl: site, countries: [{ slug: "mx", indexable: true }], cities: [{ countrySlug: "mx", slug: "cdmx", indexable: true, guideUpdatedAt: "2026-11-01T00:00:00Z" }], tours: [] };

describe("REQ-584: sitemap-viajes.xml con las fichas /viajes canónicas", () => {
  const rows = [
    { id: "a", slug: "londres-bus", kind: "transporte", countries: ["GB"], updatedAt: "2026-11-04T10:00:00Z" },
    { id: "b", slug: "louvre", kind: "tour", countries: ["FR"], updatedAt: "2026-11-05T09:00:00Z" },
    { id: "c", slug: "oculto", kind: "circuito", countries: ["IN", "NP"], updatedAt: "2026-11-05T09:00:00Z" },
  ];
  it("REQ-584: solo los visibles que no viven bajo /destinos, con su ruta /viajes", () => {
    const t = viajesSitemapTrips(rows, new Set(["b"]), (k) => k !== "circuito");
    expect(t).toEqual([{ path: "/viajes/reino-unido/londres-bus", updatedAt: "2026-11-04T10:00:00Z" }]);
  });
  it("REQ-584: el índice lista sitemap-viajes.xml y el archivo trae loc y lastmod reales", () => {
    const { index, files } = buildSitemaps({ ...base, trips: [{ path: "/viajes/reino-unido/londres-bus", updatedAt: "2026-11-04T10:00:00Z" }] });
    expect(index).toContain(`<loc>${site}/sitemap-viajes.xml</loc><lastmod>2026-11-04</lastmod>`);
    expect(files["sitemap-viajes.xml"]).toContain(`<url><loc>${site}/viajes/reino-unido/londres-bus</loc><lastmod>2026-11-04</lastmod></url>`);
  });
  it("REQ-584: sin viajes /viajes no hay archivo ni entrada en el índice", () => {
    const { index, files } = buildSitemaps(base);
    expect(files["sitemap-viajes.xml"]).toBeUndefined();
    expect(index).not.toContain("sitemap-viajes.xml");
  });
});
