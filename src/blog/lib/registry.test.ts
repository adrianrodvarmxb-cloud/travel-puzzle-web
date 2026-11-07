import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { samplePost } from "./fixtures";
import { parsePost } from "./schema";
import { visiblePosts, duplicates, related, pillarSummaries, blogNavVisible, BLOG_NAV_MIN_POSTS, linkProblems } from "./registry";
import { PILLARS, pillarBySlug, commercialHref } from "./pillars";
import { POSTS, MANUAL_POSTS } from "../content";
import { PROHIBIDAS_SITIO, textsOf } from "@/site/lib/vocab";
import { wranglerVars } from "@/site/lib/pages";

const ok = (o = {}) => { const r = parsePost(samplePost(o)); if (!r.ok) throw new Error(r.error); return r.post; };

describe("registro de artículos", () => {
  it("REQ-256: solo se ven los publicados; un borrador sale solo con BLOG_SHOW_DRAFTS (preview) y nunca de un pilar bloqueado", () => {
    const pub = ok();
    const draft = ok({ slug: "borrador", targetTerm: "otro", draft: true });
    const blocked = ok({ slug: "ft", targetTerm: "ft", pillar: "free-tours" });
    expect(visiblePosts([pub, draft, blocked], { showDrafts: false }).map((p) => p.slug)).toEqual(["articulo-de-prueba"]);
    expect(visiblePosts([pub, draft, blocked], { showDrafts: true }).map((p) => p.slug)).toEqual(["articulo-de-prueba", "borrador"]);
  });

  // REQ-984: «cero publicados» aplica a los artículos a mano; los del diario los publica el workflow (gate del 6 nov 2026).
  it("REQ-256: cero artículos a mano publicados en el repo; el ejemplo está marcado draft: true", () => {
    expect(MANUAL_POSTS.length).toBeGreaterThan(0);
    expect(MANUAL_POSTS.every((p) => p.draft === true)).toBe(true);
    expect(visiblePosts(MANUAL_POSTS.map((p) => { const r = parsePost(p); if (!r.ok) throw new Error(r.error); return r.post; }), { showDrafts: false })).toEqual([]);
  });

  // REQ-982 reemplaza la parte «BLOG_ENABLED en false» (gate «Publica solo cada día»); BLOG_SHOW_DRAFTS sigue en "false".
  it("REQ-256 + REQ-982: wrangler.jsonc trae BLOG_ENABLED en \"true\" y BLOG_SHOW_DRAFTS en \"false\"", () => {
    const v = wranglerVars(readFileSync("wrangler.jsonc", "utf8"));
    expect(v.BLOG_ENABLED).toBe("true");
    expect(v.BLOG_SHOW_DRAFTS).toBe("false");
  });

  it("REQ-257: el enlace «Blog» del pie solo con la bandera y al menos 3 artículos visibles", () => {
    const three = [1, 2, 3].map((i) => ok({ slug: `a${i}`, targetTerm: `t${i}` }));
    expect(BLOG_NAV_MIN_POSTS).toBe(3);
    expect(blogNavVisible(false, three)).toBe(false);
    expect(blogNavVisible(true, three.slice(0, 2))).toBe(false);
    expect(blogNavVisible(true, three)).toBe(true);
  });

  it("REQ-258: dos artículos con el mismo slug o el mismo término objetivo son canibalización", () => {
    expect(duplicates([ok(), ok({ slug: "otro" })])).toEqual(["término repetido: termino de prueba"]);
    expect(duplicates([ok(), ok({ targetTerm: "otro" })])).toEqual(["slug repetido: articulo-de-prueba"]);
    expect(duplicates(POSTS.map((p) => parsePost(p)).flatMap((r) => (r.ok ? [r.post] : [])))).toEqual([]);
  });

  it("REQ-259: hermanos, anterior/siguiente y resúmenes del pilar salen del registro", () => {
    const a = ok({ slug: "a", targetTerm: "a", publishedAt: "2027-01-01" });
    const b = ok({ slug: "b", targetTerm: "b", publishedAt: "2027-01-08" });
    const c = ok({ slug: "c", targetTerm: "c", publishedAt: "2027-01-15" });
    const x = ok({ slug: "x", targetTerm: "x", pillar: "peru" });
    const r = related(b, [a, b, c, x]);
    expect(r.siblings.map((p) => p.slug)).toEqual(["c", "a"]);
    expect(r.prev?.slug).toBe("a");
    expect(r.next?.slug).toBe("c");
    expect(r.explore.map((g) => g.pillar.slug)).toEqual(["china", "peru"]);
    expect(pillarSummaries("colombia", [a, b])).toEqual([]);
  });

  it("REQ-272: un publicado enlaza en el texto a su pilar, a un hermano (si hay) y a la página comercial; nunca «aquí» ni rutas apagadas", () => {
    const p = ok();
    const sib = ok({ slug: "hermano-de-prueba", targetTerm: "h" });
    expect(linkProblems(p, [p, sib], { primeraPieza: false })).toEqual([]);
    const bad = ok({ entrada: "Mira [aquí](/destinos/china).", sections: p.sections.map((s) => ({ ...s, body: ["Sin enlaces."] })) });
    expect(linkProblems(bad, [bad, sib], { primeraPieza: false })).toEqual([
      "texto de enlace genérico: «aquí»",
      "enlace a ruta apagada: /destinos/china",
      "falta enlace al pilar /blog/china",
      "falta enlace a un artículo hermano",
      "falta enlace a la página comercial",
    ]);
  });

  it("REQ-272: la página comercial del pilar cambia con PRIMERA_PIEZA_ENABLED (sin enlazar 404)", () => {
    expect(commercialHref(pillarBySlug("china")!, false)).toBe("/tours?search=China");
    // REQ-977: la ruta de país es por código; /destinos/china daba 404 (REEMPLAZA el valor anterior de este test).
    expect(commercialHref(pillarBySlug("china")!, true)).toBe("/destinos/cn");
    expect(pillarBySlug("free-tours")!.status).toBe("bloqueado");
  });

  it("REQ-273: pilares y artículos sin FREETOUR, proveedores, «expertos» ni vocabulario prohibido", () => {
    expect(textsOf(PILLARS).filter((t) => PROHIBIDAS_SITIO.test(t))).toEqual([]);
    expect(textsOf(POSTS).filter((t) => PROHIBIDAS_SITIO.test(t))).toEqual([]);
  });
});
