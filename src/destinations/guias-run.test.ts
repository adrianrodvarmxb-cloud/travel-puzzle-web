import { describe, expect, it } from "vitest";
import { validateGuidesAgainstSite, citiesByExperiences, blogTerms } from "./guias-run";
import { sampleGuide, w } from "./fixtures/guias";

const SITE = "https://t.mx";
const pages: Record<string, string> = {
  [`${SITE}/sitemap-index.xml`]: `<sitemapindex><sitemap><loc>${SITE}/s.xml</loc></sitemap></sitemapindex>`,
  [`${SITE}/s.xml`]: `<urlset>${["/destinos/fr/paris", "/destinos/cn/pekin", "/destinos/fr/paris/a", "/destinos/fr/paris/b", "/destinos/cn/pekin/c"].map((u) => `<url><loc>${SITE}${u}</loc></url>`).join("")}</urlset>`,
  [`${SITE}/destinos/fr/paris`]: "<h1>París</h1><p>Página de la ciudad</p>",
  [`${SITE}/destinos/cn/pekin`]: "<h1>Pekín</h1>",
};
const f = async (u: string) => ({ ok: u in pages, status: u in pages ? 200 : 404, text: async () => pages[u] ?? "" });
const now = new Date("2026-11-07T18:00:00Z");

describe("guías de ciudad contra el sitio", () => {
  it("REQ-1232 + REQ-1236: valida de 1 a 5 guías; una no puede repetir ciudad ni término de otra del mismo archivo", async () => {
    const pekin = sampleGuide({ pais: "cn", ciudad: "pekin", nombre: "Pekín", targetTerm: "guia de pekin" });
    const ok = await validateGuidesAgainstSite([sampleGuide(), pekin], { siteUrl: SITE, fetch: f, now, existing: [] });
    expect(ok.ok ? [] : ok.problems).toEqual([]);
    const dup = await validateGuidesAgainstSite([sampleGuide(), sampleGuide()], { siteUrl: SITE, fetch: f, now, existing: [] });
    expect(dup.ok ? [] : dup.problems.join(" ")).toMatch(/guía 2 \(\/destinos\/fr\/paris\): la ciudad fr\/paris ya tiene guía/);
    const seis = await validateGuidesAgainstSite([sampleGuide(), pekin, pekin, pekin, pekin, pekin], { siteUrl: SITE, fetch: f, now, existing: [] });
    expect(seis.ok ? [] : seis.problems).toEqual(["el archivo trae de 1 a 5 guías (arreglo JSON)"]);
    const vacio = await validateGuidesAgainstSite([], { siteUrl: SITE, fetch: f, now, existing: [] });
    expect(vacio.ok ? [] : vacio.problems).toEqual(["el archivo trae de 1 a 5 guías (arreglo JSON)"]);
    expect(w(3)).toBe("texto texto texto");
  });

  it("REQ-1229: ciudades por número de fichas publicadas; la guía no choca con términos del blog", () => {
    expect(citiesByExperiences(new Set(["/destinos/fr/paris/a", "/destinos/fr/paris/b", "/destinos/cn/pekin/c", "/destinos/fr/paris"]))).toEqual(["fr/paris", "cn/pekin"]);
    expect(blogTerms().some((t) => t.label === "EU-01")).toBe(true);
  });
});
