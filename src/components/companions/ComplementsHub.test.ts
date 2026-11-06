import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ComplementsHub } from "./ComplementsHub";
import { DEFAULT_REGISTRY, hubModel } from "@/companions/lib/registry";

const groups = hubModel(DEFAULT_REGISTRY, { whatsapp: "525536490320", citiesByEntry: { bigbus: ["Londres"] } });
const html = renderToStaticMarkup(createElement(ComplementsHub, { groups, transferWidgetSrc: "https://tpwgts.com/content?x=1" }));

describe("Sección independiente de complementos", () => {
  it("REQ-121: lista Transporte con traslados y bus turístico, cada uno con quién cobra", () => {
    expect(html).toContain(">Transporte<");
    expect(html).toContain("Traslado del aeropuerto a tu hotel");
    expect(html).toContain("Bus turístico hop-on hop-off");
    expect(html).toContain("Lo reservas con Kiwitaxi");
    expect(html).toContain("Lo reservas con Travel Puzzle");
    expect(html).toContain("A cotizar");
    expect(html).toContain("Disponible en: Londres");
  });

  it("REQ-120: el cuadro de Kiwitaxi no se pinta suelto: solo al tocar «Buscar traslado»", () => {
    expect(html).toContain("Buscar traslado");
    expect(html).not.toContain("tpwgts.com");
    expect(html).not.toContain("Buscador de traslados");
  });
});
