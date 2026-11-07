import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExperienceCard } from "./ExperienceCard";
import { CardRail } from "./CardRail";
import { experienceCard } from "@/tours/lib/experience-card";

const card = experienceCard({
  key: "t1", href: "/tours/t1", title: "Visita gratuita a Montmartre", image: "https://img/m.jpg", city: "París", duration: "2 h 30 min",
  description: "Barrio de artistas.", formato: "pieza-libre", rating: 4.92, reviews: 934, provider: "París Paso a Paso Tours", price: { text: "Free tour", free: true },
}, "es");
const html = () => renderToStaticMarkup(createElement(ExperienceCard, { card }));

describe("ExperienceCard", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("REQ-520 REQ-523 REQ-524 REQ-525: el orden fijo — meta, título, descripción, precio y fila estrellas | proveedor", () => {
    const h = html();
    const order = ["card-meta", "<h3", "card-description", "card-price", "card-rating", "card-provider"].map((k) => h.indexOf(k));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(h).toContain("París · 2 h 30 min");
    expect(h).toContain("934 reseñas");
    expect(h).toContain("París Paso a Paso Tours");
  });

  it("REQ-521 REQ-526: sobre la foto solo «★ Favorito» (izquierda) y la categoría (derecha); ni logos ni otro texto", () => {
    const h = html();
    const photo = h.slice(h.indexOf("aspect-[4/3]"), h.indexOf("card-meta"));
    expect(photo).toContain("left-3 top-3");
    expect(photo).toContain("Favorito");
    expect(photo).toContain("right-3 top-3");
    expect(photo).toContain("Pieza libre");
    expect(photo.match(/data-testid="card-(favorite|category)"/g)).toHaveLength(2);
    expect(photo).not.toMatch(/Free tour|reseñas|freetour|Recomendado|<svg/i);
    expect(h).not.toContain("de los viajeros");
  });

  it("REQ-520: sin Intl en el navegador (INC-001)", () => {
    vi.stubGlobal("Intl", undefined);
    expect(html()).toContain("Visita gratuita a Montmartre");
  });

  it("REQ-527: look and feel — esquinas de 20 px, foto 4:3 con zoom suave, insignias en píldora", () => {
    const h = html();
    expect(h).toContain("rounded-[20px]");
    expect(h).toContain("aspect-[4/3]");
    expect(h).toContain("group-hover:scale-105");
    expect(h).toContain("rounded-full");
  });

  it("REQ-527: carrusel — flechas en escritorio, 3 visibles en escritorio, 2 en tablet y la siguiente asomándose en celular", () => {
    const h = renderToStaticMarkup(createElement(CardRail, { label: "Los más elegidos", children: [createElement("div", { key: 1 }), createElement("div", { key: 2 })] }));
    expect(h).toContain('data-testid="rail-arrows"');
    expect(h).toContain("md:flex");
    expect(h).toContain("[&amp;&gt;*]:w-[84%]");
    expect(h).toContain("lg:[&amp;&gt;*]:w-[calc((100%-2.5rem)/3)]");
    expect(h).toContain("md:[&amp;&gt;*]:w-[calc((100%-1.25rem)/2)]");
    expect(h).toContain("snap-x");
  });
});
