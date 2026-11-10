import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { socialPack, socialProblems, laminasFor, LIMITS, utmUrl, HASHTAGS } from "./textos";
import { parsePost, type Post, type PostInput } from "@/blog/lib/schema";
import { sampleDaily } from "@/blog/lib/fixtures";

const SITE = "https://travelpuzzle.com.mx";
const eu01: Post = (() => { const r = parsePost(JSON.parse(readFileSync("docs/blog/ejemplos/2026-11-07-eu-01-requisitos-entrar-europa.json", "utf8"))); if (!r.ok) throw new Error(r.error); return r.post; })();
const parsed = (o: Partial<PostInput> = {}) => { const r = parsePost(sampleDaily(o)); if (!r.ok) throw new Error(r.error); return r.post; };
const URL_EU01 = `${SITE}/blog/europa/requisitos-para-entrar-a-europa-2026`;

describe("textos de redes desde la entrada del día", () => {
  it("REQ-1070: LinkedIn — 1,200 a 1,800 caracteres, gancho en la 1a línea, 3 a 5 viñetas, enlace con UTM de LinkedIn y 3 a 5 hashtags", () => {
    const li = socialPack(eu01, SITE).linkedin;
    expect(li.length).toBeGreaterThanOrEqual(LIMITS.linkedin.min);
    expect(li.length).toBeLessThanOrEqual(LIMITS.linkedin.max);
    expect(li.split("\n")[0]).toBe(eu01.title);
    const bullets = li.split("\n").filter((l) => l.startsWith("• "));
    expect(bullets.length).toBeGreaterThanOrEqual(3);
    expect(bullets.length).toBeLessThanOrEqual(5);
    expect(li).toContain(`${URL_EU01}?utm_source=linkedin&utm_medium=social&utm_campaign=blog`);
    const tags = li.match(/#\p{L}[\p{L}\d]*/gu) ?? [];
    expect(tags.length).toBeGreaterThanOrEqual(3);
    expect(tags.length).toBeLessThanOrEqual(5);
  });

  it("REQ-1071: Facebook — 400 a 800 caracteres, tono cercano y enlace con UTM de Facebook", () => {
    const fb = socialPack(eu01, SITE).facebook;
    expect(fb.length).toBeGreaterThanOrEqual(LIMITS.facebook.min);
    expect(fb.length).toBeLessThanOrEqual(LIMITS.facebook.max);
    expect(fb).toContain(`${URL_EU01}?utm_source=facebook&utm_medium=social&utm_campaign=blog`);
    expect(fb).not.toContain("utm_source=linkedin");
  });

  it("REQ-1072: Instagram — caption de hasta 2,200 caracteres con «link en bio», sin URL, y 10 a 15 hashtags", () => {
    const ig = socialPack(eu01, SITE).instagram.caption;
    expect(ig.length).toBeLessThanOrEqual(LIMITS.instagram.max);
    expect(ig).toMatch(/link en bio/i);
    expect(ig).not.toMatch(/https?:\/\//);
    const tags = ig.match(/#\p{L}[\p{L}\d]*/gu) ?? [];
    expect(tags.length).toBeGreaterThanOrEqual(10);
    expect(tags.length).toBeLessThanOrEqual(15);
    expect(new Set(tags).size).toBe(tags.length);
    for (const p of Object.keys(HASHTAGS)) expect(HASHTAGS[p as keyof typeof HASHTAGS].every((t) => !/free ?tour/i.test(t)), p).toBe(true);
  });

  it("REQ-1073: carrusel de 3 a 5 láminas: portada y 3 o 4 datos clave, cada uno con su fuente del artículo", () => {
    const l = laminasFor(eu01);
    expect(l.length).toBeGreaterThanOrEqual(3);
    expect(l.length).toBeLessThanOrEqual(5);
    expect(l[0]).toMatchObject({ tipo: "portada", titulo: eu01.title, imagen: eu01.cover!.src, credito: eu01.cover!.credit });
    for (const d of l.slice(1)) {
      expect(d.tipo).toBe("dato");
      if (d.tipo === "dato") { expect(d.fuente.length).toBeGreaterThan(3); expect(d.texto.length).toBeLessThanOrEqual(170); }
    }
    expect(l.slice(1).map((d) => (d.tipo === "dato" ? d.fuente : ""))).toContain("Consejo de la Unión Europea");
  });

  it("REQ-1516: cada lámina lleva su foto de la entrada, en orden; la portada usa la de portada", () => {
    const l = laminasFor(eu01);
    for (const x of l) { expect(x.imagen).toMatch(/^\/blog\/img\//); expect(x.credito.length).toBeGreaterThan(0); }
    expect(l[0].imagen).toBe(eu01.cover!.src);
  });

  it("REQ-1516: sin fotos no hay láminas (el carrusel no sale sin imagen)", () => {
    expect(laminasFor({ ...eu01, cover: undefined, imagenes: [] } as typeof eu01)).toEqual([]);
  });

  it("REQ-1074: los textos de EU-01 pasan las mismas reglas del blog", () => {
    expect(socialProblems(socialPack(eu01, SITE), eu01, SITE)).toEqual([]);
  });

  it("REQ-1074 + REQ-1084: rechaza FREETOUR, vocabulario prohibido, cifras que no están con fuente en el artículo y UTM equivocado", () => {
    const pack = socialPack(eu01, SITE);
    const bad = (o: Partial<typeof pack>) => socialProblems({ ...pack, ...o }, eu01, SITE).join(" ");
    expect(bad({ facebook: `${pack.facebook} Lo opera FREETOUR.` })).toMatch(/facebook: vocabulario prohibido/);
    expect(bad({ linkedin: `${pack.linkedin}\nLo dicen los expertos.` })).toMatch(/linkedin: vocabulario prohibido/);
    expect(bad({ facebook: pack.facebook.replace("90", "120") })).toMatch(/facebook: la cifra «120» no está con fuente en el artículo/);
    expect(bad({ facebook: pack.facebook.replace("utm_source=facebook", "utm_source=linkedin") })).toMatch(/facebook: falta el enlace con UTM de facebook/);
    expect(bad({ instagram: { ...pack.instagram, caption: `${pack.instagram.caption} ${"x".repeat(2300)}` } })).toMatch(/instagram: más de 2200 caracteres/);
    expect(bad({ instagram: { ...pack.instagram, laminas: pack.instagram.laminas.slice(0, 2) } })).toMatch(/instagram: el carrusel lleva de 3 a 5 láminas/);
  });

  it("REQ-1070: el UTM se agrega a la URL canónica del artículo", () => {
    expect(utmUrl(`${SITE}/blog/x/y`, "linkedin")).toBe(`${SITE}/blog/x/y?utm_source=linkedin&utm_medium=social&utm_campaign=blog`);
    expect(socialPack(parsed(), SITE).linkedin).toContain("/blog/europa/entrada-diaria-de-prueba?utm_source=linkedin");
  });
});
