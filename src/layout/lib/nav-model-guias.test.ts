import { describe, it, expect } from "vitest";
import { footerColumns } from "./nav-model";

// REQ-3335 (gate A3): la columna «Guías» del pie lleva a las guías de ciudad, no a las categorías del blog.
const labels = { destinos: "Destinos", tours: "Experiencias", transfers: "Traslados", blog: "Blog" };
const pillars = [{ href: "/blog/china", label: "China desde México" }];
const guides = [{ href: "/guias", label: "Todas las guías" }, { href: "/guias#cn", label: "China" }];
const cols = (o: { guides?: typeof guides; blog?: boolean; lang?: string }) =>
  footerColumns({
    lang: o.lang ?? "es", labels, transfers: true, primeraPieza: true, blog: o.blog ?? true,
    pages: { nosotros: true, contacto: true, expertos: false, blog: true }, helpEnabled: true, pillars, guides: o.guides,
  });

describe("REQ-3335: columna «Guías» del pie", () => {
  it("REQ-3335: con guías, la columna «Guías» muestra las guías de ciudad y no las categorías del blog", () => {
    const g = cols({ guides }).find((c) => c.title === "Guías");
    expect(g?.links).toEqual(guides);
    expect(cols({ guides }).flatMap((c) => c.links).some((l) => l.href.startsWith("/blog/"))).toBe(false);
  });

  it("REQ-3335: la columna sale aunque el blog esté apagado (las guías no dependen del blog)", () => {
    expect(cols({ guides, blog: false }).some((c) => c.title === "Guías")).toBe(true);
  });

  it("REQ-3335: Blog queda una sola vez en el pie, en «Empresa»", () => {
    const all = cols({ guides }).flatMap((c) => c.links).filter((l) => l.href === "/blog");
    expect(all).toHaveLength(1);
    expect(cols({ guides }).find((c) => c.title === "Empresa")?.links.some((l) => l.href === "/blog")).toBe(true);
  });

  it("REQ-3335: en inglés la columna se llama «Guides»; sin guías en el idioma, no sale", () => {
    expect(cols({ guides, lang: "en" }).some((c) => c.title === "Guides")).toBe(true);
    expect(cols({ guides: [], lang: "en" }).some((c) => c.title === "Guides")).toBe(false);
  });
});
