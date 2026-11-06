import { describe, expect, it } from "vitest";
import { samplePost } from "./fixtures";
import { parsePost } from "./schema";
import { blogPostingJsonLd, postMeta, shareLinks, blogSitemapUrls } from "./seo";
import { AUTHORS } from "../content/authors";

const post = (o = {}) => { const r = parsePost(samplePost(o)); if (!r.ok) throw new Error(r.error); return r.post; };
const site = "https://travelpuzzle.com.mx";

describe("SEO del blog", () => {
  it("REQ-274: BlogPosting coherente con lo visible; Person sin jobTitle mientras el cargo no esté confirmado", () => {
    const j = blogPostingJsonLd(post(), AUTHORS.claudia, site);
    expect(j).toMatchObject({
      "@type": "BlogPosting",
      headline: "Artículo de prueba: ¿cómo se valida?",
      datePublished: "2027-01-11",
      inLanguage: "es-MX",
      articleSection: "China desde México",
      mainEntityOfPage: `${site}/blog/china/articulo-de-prueba`,
      author: { "@type": "Person", name: "Claudia Leticia Rodríguez Laveaga" },
      publisher: { "@id": `${site}/#organization` },
    });
    expect(j.author).not.toHaveProperty("jobTitle");
    expect(j).not.toHaveProperty("dateModified");
    expect(blogPostingJsonLd(post({ updatedAt: "2027-02-01" }), AUTHORS.claudia, site).dateModified).toBe("2027-02-01");
  });

  it("REQ-274: title con la marca al final, description ≤155 y canonical propio; un borrador lleva noindex", () => {
    const m = postMeta(post());
    expect(m.title).toBe("Artículo de prueba: ¿cómo se valida?");
    expect(m.canonical).toBe("/blog/china/articulo-de-prueba");
    expect(m.description.length).toBeLessThanOrEqual(155);
    expect(m.noindex).toBe(false);
    expect(postMeta(post({ draft: true })).noindex).toBe(true);
  });

  it("REQ-275: compartir en WhatsApp, Facebook y LinkedIn con UTM del blog", () => {
    const s = shareLinks(`${site}/blog/china/articulo-de-prueba`, "Título");
    expect(s.map((x) => x.name)).toEqual(["WhatsApp", "Facebook", "LinkedIn"]);
    for (const x of s) expect(decodeURIComponent(x.href)).toContain(`utm_source=${x.name.toLowerCase()}&utm_medium=social&utm_campaign=blog`);
  });

  it("REQ-275: el sitemap del blog solo lleva publicados, con lastmod = actualización real", () => {
    const urls = blogSitemapUrls([post(), post({ slug: "b", targetTerm: "b", draft: true }), post({ slug: "c", targetTerm: "c", updatedAt: "2027-03-01" })], site);
    expect(urls.map((u) => u.loc)).toEqual([`${site}/blog`, `${site}/blog/china`, `${site}/blog/china/articulo-de-prueba`, `${site}/blog/china/c`]);
    expect(urls.find((u) => u.loc.endsWith("/c"))?.lastmod).toBe("2027-03-01");
    expect(blogSitemapUrls([post({ draft: true })], site)).toEqual([]);
  });
});
