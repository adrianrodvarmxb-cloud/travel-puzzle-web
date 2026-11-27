import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MigasBlock } from "./MigasBlock";
import { GaleriaBlock } from "./GaleriaBlock";
import { fichaCrumbs } from "@/ficha/lib/crumbs";
import { galleryLayout } from "@/ficha/lib/gallery";
import { fichaEjemplo } from "@/ficha/lib/fixtures";

const f = fichaEjemplo();
const fotos = (n: number) => Array.from({ length: n }, (_, i) => ({ url: `https://img.example.com/${i}.jpg`, alt: null }));

describe("Bloques 1 y 2 de la ficha única", () => {
  it("REQ-10808: las migas enlazan país y ciudad y la última es la ficha sin enlace", () => {
    const html = renderToStaticMarkup(createElement(MigasBlock, { items: fichaCrumbs(f) }));
    expect(html).toContain('href="/destinos/ar"');
    expect(html).toContain('href="/destinos/ar/el-calafate"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Tour de ejemplo");
    expect(renderToStaticMarkup(createElement(MigasBlock, { items: [] }))).toBe("");
  });

  it("REQ-10809: con una foto, foto única; con seis, 1 grande + 4 y «+1»", () => {
    const una = renderToStaticMarkup(createElement(GaleriaBlock, { layout: galleryLayout(fotos(1)), title: f.title }));
    expect(una.match(/<img /g)).toHaveLength(1);
    expect(una).toContain(`alt="${f.title}"`);
    const seis = renderToStaticMarkup(createElement(GaleriaBlock, { layout: galleryLayout(fotos(6)), title: f.title }));
    expect(seis.match(/<img /g)).toHaveLength(5);
    expect(seis).toContain("+1");
    expect(renderToStaticMarkup(createElement(GaleriaBlock, { layout: galleryLayout([]), title: f.title }))).toBe("");
  });
});
