import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { knownPathsFromSitemaps, visibleText, fichaTextsFor, todayCdmx, validateAgainstSite, planForToday } from "./diario-run";
import { sampleDaily } from "./lib/fixtures";

const SITE = "https://t.mx";
const pages: Record<string, string> = {
  [`${SITE}/sitemap-index.xml`]: `<sitemapindex><sitemap><loc>${SITE}/sitemap-tours-fr.xml</loc></sitemap><sitemap><loc>${SITE}/sitemap-roto.xml</loc></sitemap></sitemapindex>`,
  [`${SITE}/sitemap-tours-fr.xml`]: `<urlset><url><loc>${SITE}/destinos/fr/paris</loc></url><url><loc>${SITE}/destinos/fr/paris/paseo-de-prueba</loc></url></urlset>`,
  [`${SITE}/destinos/fr/paris/paseo-de-prueba`]: "<html><script>x()</script><h1>Paseo</h1><p>Texto de la ficha</p></html>",
};
const fakeFetch = async (u: string) => ({ ok: u in pages, status: u in pages ? 200 : 404, text: async () => pages[u] ?? "" });

describe("raíz del blog diario (I/O inyectado)", () => {
  it("REQ-968: las rutas conocidas salen de los sitemaps de producción más las fijas; un archivo roto no tumba la lista", async () => {
    const logs: string[] = [];
    const paths = await knownPathsFromSitemaps(SITE, fakeFetch, (l) => logs.push(l));
    expect(paths.has("/destinos/fr/paris/paseo-de-prueba")).toBe(true);
    expect(paths.has("/tours")).toBe(true);
    expect(logs).toEqual([`[blog-diario] no se pudo leer ${SITE}/sitemap-roto.xml`]);
  });

  it("REQ-963: el texto de las fichas enlazadas se lee sin scripts ni etiquetas", async () => {
    expect(visibleText("<p>Hola&nbsp;<b>mundo</b></p><script>no()</script>")).toBe("Hola mundo");
    const input = sampleDaily({ sections: sampleDaily().sections!.map((s, i) => (i ? s : { ...s, body: ["Ve el [paseo](/destinos/fr/paris/paseo-de-prueba)."] })) });
    expect(await fichaTextsFor(input, SITE, fakeFetch)).toEqual({ "/destinos/fr/paris/paseo-de-prueba": "Paseo Texto de la ficha" });
  });

  it("REQ-969: la fecha de hoy es la de la Ciudad de México", () => {
    expect(todayCdmx(new Date("2026-11-08T03:00:00Z"))).toBe("2026-11-07");
    expect(todayCdmx(new Date("2026-11-08T07:00:00Z"))).toBe("2026-11-08");
  });

  it("REQ-975 + REQ-1074: valida contra el sitio y el registro con todo inyectado, incluidos los textos de redes", async () => {
    const eu01 = JSON.parse(readFileSync("docs/blog/ejemplos/2026-11-07-eu-01-requisitos-entrar-europa.json", "utf8"));
    const site: Record<string, string> = { ...pages, [`${SITE}/sitemap-tours-fr.xml`]: `<urlset>${["/destinos/fr/paris", "/destinos/es/sevilla", "/destinos/cz/praga", "/destinos/pt/lisboa"].map((u) => `<url><loc>${SITE}${u}</loc></url>`).join("")}</urlset>` };
    const f = async (u: string) => ({ ok: u in site, status: u in site ? 200 : 404, text: async () => site[u] ?? "" });
    const r = await validateAgainstSite(eu01, { siteUrl: SITE, fetch: f, now: new Date("2026-11-07T18:00:00Z"), primeraPieza: true, source: [] });
    expect(r.ok ? [] : r.problems).toEqual([]);
    const corto = await validateAgainstSite(sampleDaily({ tema: { tipo: "calendario", clusterId: "EU-01", fuentes: [] }, targetTerm: "requisitos para entrar a europa 2026 mexicanos" }), { siteUrl: SITE, fetch: fakeFetch, now: new Date("2026-11-07T18:00:00Z"), primeraPieza: true, source: [] });
    expect(corto.ok ? [] : corto.problems.join(" ")).toMatch(/redes: linkedin: debe tener de 1200 a 1800 caracteres/);
    expect(planForToday(new Date("2026-11-07T18:00:00Z"), [])).toMatchObject({ today: "2026-11-07", kind: "pago", item: { id: "EU-01" } });
  });
});

describe("archivos de imagen", () => {
  it("REQ-1055: exige las 6 variantes de cada imagen en public/ (portada + 2 fotos = 18)", async () => {
    const { missingImageFiles } = await import("./diario-run");
    const { parsePost } = await import("./lib/schema");
    const r = parsePost(sampleDaily());
    if (!r.ok) throw new Error(r.error);
    expect(missingImageFiles(r.post, () => false)).toHaveLength(18);
    expect(missingImageFiles(r.post, () => true)).toEqual([]);
    expect(missingImageFiles(r.post, (f) => !f.endsWith("portada-1600.avif"))).toEqual(["public/blog/img/entrada-diaria-de-prueba/portada-1600.avif"]);
  });
});
