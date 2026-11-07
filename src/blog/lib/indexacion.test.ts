import { describe, expect, it } from "vitest";
import { sampleDaily, samplePost } from "./fixtures";
import { parsePost, type PostInput } from "./schema";
import { blogPostingJsonLd, blogSitemapUrls, blogIndexNowUrls, blogLlmsEntries, blogSmokePaths } from "./seo";
import { PILLARS, pillarBySlug, commercialHref } from "./pillars";
import { AUTHORS } from "../content/authors";
import { MANUAL_POSTS, DIARIO_POSTS, POSTS } from "../content";
import { urlsetXml } from "@/seo/lib/sitemaps";
import { changedUrls } from "@/seo/lib/indexnow";
import { llmsTxt } from "@/seo/lib/robots";
import { articleModel } from "./view";

const site = "https://travelpuzzle.com.mx";
const post = (o: Partial<PostInput> = {}, daily = true) => { const r = parsePost(daily ? sampleDaily(o) : samplePost(o)); if (!r.ok) throw new Error(r.error); return r.post; };

describe("marcado e indexación del blog diario", () => {
  it("REQ-971: autor «Equipo editorial de Travel Puzzle» como Organization ligada al sitio; nunca Person", () => {
    expect(AUTHORS.editorial).toMatchObject({ kind: "Organization", name: "Equipo editorial de Travel Puzzle", jobTitle: null, photo: null });
    const j = blogPostingJsonLd(post(), AUTHORS.editorial, site);
    expect(j.author).toEqual({ "@type": "Organization", name: "Equipo editorial de Travel Puzzle", url: `${site}/`, parentOrganization: { "@id": `${site}/#organization` } });
    expect(j.publisher).toEqual({ "@id": `${site}/#organization` });
    expect(blogPostingJsonLd(post({}, false), AUTHORS.claudia, site).author).toMatchObject({ "@type": "Person" });
    const m = articleModel(post(), [post()], { author: AUTHORS.editorial, siteUrl: site, primeraPieza: true, whatsapp: null, authorHref: null });
    expect(m.author.name).toBe("Equipo editorial de Travel Puzzle");
    expect(m.minutes).toBeGreaterThanOrEqual(1);
  });

  it("REQ-972: la entrada del diario entra al sitemap con lastmod = su fecha real", () => {
    const urls = blogSitemapUrls([post()], site);
    expect(urls).toEqual([
      { loc: `${site}/blog`, lastmod: "2026-11-07" },
      { loc: `${site}/blog/europa`, lastmod: "2026-11-07" },
      { loc: `${site}/blog/europa/entrada-diaria-de-prueba`, lastmod: "2026-11-07" },
    ]);
  });

  it("REQ-974: el cron de IndexNow ve las URL del blog, y el aviso tras publicar lleva entrada, /blog y pilar", () => {
    const xml = urlsetXml(blogSitemapUrls([post()], site));
    expect(changedUrls({ "sitemap-paginas.xml": xml }, "2026-11-06")).toEqual([`${site}/blog`, `${site}/blog/europa`, `${site}/blog/europa/entrada-diaria-de-prueba`]);
    expect(blogIndexNowUrls(post(), site)).toEqual([`${site}/blog/europa/entrada-diaria-de-prueba`, `${site}/blog`, `${site}/blog/europa`]);
  });

  it("REQ-973: llms.txt trae «## Blog» con las 20 entradas más recientes; sin publicados no aparece", () => {
    const many = Array.from({ length: 22 }, (_, i) => post({ slug: `e${i}`, targetTerm: `t${i}`, publishedAt: `2026-12-${String(i + 1).padStart(2, "0")}` }));
    const entries = blogLlmsEntries([...many, post({ slug: "b", targetTerm: "b", draft: true })], site);
    expect(entries.length).toBe(20);
    expect(entries[0]).toEqual({ name: many[21].title, url: `${site}/blog/europa/e21` });
    const txt = llmsTxt({ siteUrl: site, destinations: [], blog: entries.slice(0, 1) });
    expect(txt).toContain(`## Blog\n\n- [${many[21].title}](${site}/blog/europa/e21)`);
    expect(llmsTxt({ siteUrl: site, destinations: [] })).not.toContain("## Blog");
  });

  it("REQ-976: con el blog encendido el humo prueba /blog, los pilares con artículos y las 5 entradas más recientes", () => {
    const many = Array.from({ length: 7 }, (_, i) => post({ slug: `e${i}`, targetTerm: `t${i}`, publishedAt: `2026-12-0${i + 1}` }));
    expect(blogSmokePaths([...many, post({ slug: "c", targetTerm: "c", pillar: "china", draft: true })])).toEqual(["/blog", "/blog/europa", "/blog/europa/e6", "/blog/europa/e5", "/blog/europa/e4", "/blog/europa/e3", "/blog/europa/e2"]);
    expect(blogSmokePaths([])).toEqual([]);
  });

  it("REQ-977: con PRIMERA_PIEZA los pilares enlazan a rutas que existen (/destinos/cn, /pe, /co)", () => {
    expect(commercialHref(pillarBySlug("china")!, true)).toBe("/destinos/cn");
    expect(commercialHref(pillarBySlug("peru")!, true)).toBe("/destinos/pe");
    expect(commercialHref(pillarBySlug("colombia")!, true)).toBe("/destinos/co");
    for (const p of PILLARS) if (p.commercial.destinos) expect(p.commercial.destinos, p.slug).not.toMatch(/^\/destinos\/(china|peru|colombia|mexico)\b/);
  });

  it("REQ-978: pilar Ciudad de México activo, con su página comercial", () => {
    expect(pillarBySlug("mexico")).toMatchObject({ status: "activo", name: "Ciudad de México", commercial: { destinos: "/destinos/mx/ciudad-de-mexico" } });
  });

  it("REQ-984 (reemplaza parte de REQ-256): los artículos a mano siguen en borrador; los del diario son del agente", () => {
    expect(POSTS).toEqual([...MANUAL_POSTS, ...DIARIO_POSTS]);
    expect(MANUAL_POSTS.every((p) => p.draft === true)).toBe(true);
    for (const p of DIARIO_POSTS) {
      expect(p.origen, p.slug).toBe("agente-diario");
      expect(p.author, p.slug).toBe("editorial");
    }
  });
});

describe("imágenes en el marcado", () => {
  it("REQ-1058: el JSON-LD lleva la portada en JPG de 1600 px y la tarjeta usa la de 800; el tiempo de lectura no cuenta créditos", async () => {
    const { cardModel } = await import("./view");
    const p = post();
    expect(blogPostingJsonLd(p, AUTHORS.editorial, site).image).toBe(`${site}/blog/img/entrada-diaria-de-prueba/portada-1600.jpg`);
    expect(cardModel(p).cover).toEqual({ src: "/blog/img/entrada-diaria-de-prueba/portada-800.jpg", alt: "Foto de prueba portada" });
    const sinFotos = articleModel(post({ cover: undefined, imagenes: undefined }), [], { author: AUTHORS.editorial, siteUrl: site, primeraPieza: true, whatsapp: null, authorHref: null });
    const conFotos = articleModel(p, [], { author: AUTHORS.editorial, siteUrl: site, primeraPieza: true, whatsapp: null, authorHref: null });
    expect(conFotos.minutes).toBe(sinFotos.minutes);
  });
});
