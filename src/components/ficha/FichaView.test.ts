import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FichaView, type FichaBlockViews } from "./FichaView";
import { blocksFor, BLOCK_ORDER, type BlockContext } from "@/ficha/lib/blocks";
import { fichaCrumbs } from "@/ficha/lib/crumbs";
import { titleView } from "@/ficha/lib/title";
import { guaranteesBlockView } from "@/ficha/lib/guarantees";
import { milaBlockView } from "@/ficha/lib/closing-view";
import { fichaEjemplo } from "@/ficha/lib/fixtures";
import type { FichaModel } from "@/ficha/lib/model";

const r = renderToStaticMarkup;
const ctx: BlockContext = { reviews: 0, faq: 0, crossSell: 0, others: 0, milaEnabled: true, freetourFaqEnabled: false };
const views = (f: FichaModel): FichaBlockViews => ({
  migas: { items: fichaCrumbs({ country: f.country, city: f.city, title: f.title, lang: f.lang }) },
  titulo: { view: titleView({ title: f.title, rating: f.rating, provider: f.provider, lang: f.lang }) },
  "en-breve": { text: f.brief, heading: "En breve" },
  mila: { view: milaBlockView(f, "5215512345678", {}) },
  garantias: { view: guaranteesBlockView(f) },
});
const pos = (html: string, id: string) => html.indexOf(`data-slot="${id}"`);

describe("FichaView: la plantilla solo compone (ola 7)", () => {
  it("REQ-10857: pinta en el orden de blocksFor y se salta los bloques sin props", () => {
    const f = fichaEjemplo();
    const order = blocksFor(f, ctx);
    const out = r(createElement(FichaView, { order, views: views(f) }));
    expect(out).toContain('data-ficha="unica"');
    expect(pos(out, "titulo")).toBeLessThan(pos(out, "en-breve"));
    expect(pos(out, "en-breve")).toBeLessThan(pos(out, "mila"));
    expect(pos(out, "mila")).toBeLessThan(pos(out, "garantias"));
    expect(out).toContain('data-bloque="garantias"');
    expect(out).not.toContain("N/D");
    // la galería está en el orden pero sin props: no se pinta nada de ella
    expect(order).toContain("galeria");
    expect(out).not.toContain('data-bloque="galeria"');
  });

  it("REQ-10857: el orden manda; FREETOUR sin «En breve» ni Mila aunque lleguen sus props (decisiones 42 y REQ-570)", () => {
    const f = { ...fichaEjemplo(), provider: "freetour" };
    const out = r(createElement(FichaView, { order: blocksFor(f, ctx), views: views(fichaEjemplo()) }));
    expect(out).not.toContain('data-slot="en-breve"');
    expect(out).not.toContain('data-slot="mila"');
    expect(out).toContain('data-slot="titulo"');
  });

  it("REQ-10857: panel en la columna de computadora; «Agregar» en el cuerpo en celular bajo el título; barra de celular aparte", () => {
    const f = fichaEjemplo();
    const out = r(createElement(FichaView, {
      order: blocksFor(f, ctx), views: views(f),
      panel: createElement("aside", { "data-panel": "reserva" }), mobileAdd: createElement("button", null, "Agregar a mi viaje"), mobileBar: createElement("nav", null, "barra"),
    }));
    expect(out).toMatch(/data-panel-columna[^>]*class="hidden lg:block"><div class="sticky top-8"><aside data-panel="reserva">/);
    expect(out.indexOf("data-agregar-celular")).toBeGreaterThan(pos(out, "titulo"));
    expect(out.indexOf("data-agregar-celular")).toBeLessThan(pos(out, "en-breve"));
    expect(out).toContain("<nav>barra</nav>");
    expect(r(createElement(FichaView, { order: [], views: {} }))).not.toContain("data-panel-columna");
  });

  it("REQ-10870: sin barra fija de celular (viajes), `panelOnMobile` muestra el mismo panel debajo del contenido en celular; sin la prop, como hoy", () => {
    const f = fichaEjemplo();
    const base = { order: blocksFor(f, ctx), views: views(f), panel: createElement("aside", { "data-panel": "reserva" }) };
    const movil = r(createElement(FichaView, { ...base, panelOnMobile: true }));
    expect(movil).toMatch(/data-panel-columna[^>]*class="mt-8 lg:mt-0"><div class="lg:sticky lg:top-8"><aside data-panel="reserva">/);
    expect(movil.indexOf("data-panel-columna")).toBeGreaterThan(pos(movil, "garantias"));
    expect((movil.match(/data-panel="reserva"/g) ?? []).length).toBe(1); // un solo panel en el DOM: sin ids ni formularios repetidos
    expect(r(createElement(FichaView, base))).toMatch(/data-panel-columna[^>]*class="hidden lg:block"/);
  });

  it("REQ-10857: hay un componente para cada uno de los 21 bloques del plan", () => {
    expect(BLOCK_ORDER).toHaveLength(21);
  });
});
