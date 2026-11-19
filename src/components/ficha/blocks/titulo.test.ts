import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TituloBlock } from "./TituloBlock";
import { titleView } from "@/ficha/lib/title";
import { fichaEjemplo } from "@/ficha/lib/fixtures";

const render = (f: ReturnType<typeof fichaEjemplo>) =>
  renderToStaticMarkup(createElement(TituloBlock, { view: titleView({ title: f.title, rating: f.rating, provider: f.provider, lang: f.lang }) }));

describe("Bloque 3 de la ficha única", () => {
  it("REQ-10810: título en h1 con nota y conteo, sin nombrar al proveedor ni al operador", () => {
    const f = fichaEjemplo();
    const html = render(f);
    expect(html).toContain("<h1");
    expect(html).toContain("Tour de ejemplo");
    expect(html).toContain("4.5");
    expect(html).toContain("45 reseñas");
    expect(html).not.toContain("Favorito");
    expect(html).not.toContain(f.operator!);
  });

  it("REQ-10810: en Tangol, solo el título (sin estrellas ni «Favorito»)", () => {
    const f = { ...fichaEjemplo(), provider: "tangol", rating: { value: 4.9, count: 900, favorite: true } };
    const html = render(f);
    expect(html).not.toContain("★");
    expect(html).not.toContain("900");
  });
});
