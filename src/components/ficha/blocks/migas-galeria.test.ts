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

describe("REQ-10896: galería sin huecos con 2, 3, 4 y 5 fotos", () => {
  it("REQ-10896: con 4 fotos la primera lateral va a lo ancho y las otras dos abajo (sin hueco); con 2, una lateral grande", () => {
    const cuatro = renderToStaticMarkup(createElement(GaleriaBlock, { layout: galleryLayout(fotos(4)), title: f.title }));
    expect(cuatro.match(/data-celda="2x1"/g)).toHaveLength(1);
    expect(cuatro.match(/data-celda="1x1"/g)).toHaveLength(2);
    expect(cuatro).toContain("md:col-span-2 md:row-span-1");
    const dos = renderToStaticMarkup(createElement(GaleriaBlock, { layout: galleryLayout(fotos(2)), title: f.title }));
    expect(dos.match(/data-celda="2x2"/g)).toHaveLength(1);
    const cinco = renderToStaticMarkup(createElement(GaleriaBlock, { layout: galleryLayout(fotos(5)), title: f.title }));
    expect(cinco.match(/data-celda="1x1"/g)).toHaveLength(4);
    expect(cinco).not.toContain("+");
  });
});
