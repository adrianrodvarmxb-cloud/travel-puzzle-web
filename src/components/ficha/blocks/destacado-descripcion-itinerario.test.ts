import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DestacadoBlock } from "./DestacadoBlock";
import { DescripcionBlock } from "./DescripcionBlock";
import { ItinerarioBlock } from "./ItinerarioBlock";
import { contentHeading, descriptionHtml, highlightItems, itineraryDays } from "@/ficha/lib/content-view";
import { fichaEjemplo } from "@/ficha/lib/fixtures";

const f = fichaEjemplo();
const r = renderToStaticMarkup;

describe("Bloques 7, 8 y 9 de la ficha única", () => {
  it("REQ-10817: lo más destacado solo si el proveedor lo trae", () => {
    expect(r(createElement(DestacadoBlock, { items: highlightItems(f.highlights), heading: contentHeading("destacado", f.lang) }))).toBe("");
    const out = r(createElement(DestacadoBlock, { items: highlightItems(["Glaciar"]), heading: contentHeading("destacado", "es") }));
    expect(out).toContain("Lo más destacado");
    expect(out).toContain("Glaciar");
  });

  it("REQ-10818: descripción saneada, sin script; sin texto no pinta nada", () => {
    const out = r(createElement(DescripcionBlock, { html: descriptionHtml(f.descriptionHtml + "<script>x()</script>", f.provider), heading: contentHeading("descripcion", f.lang) }));
    expect(out).toContain("<p>Descripción.</p>");
    expect(out).not.toContain("script");
    expect(r(createElement(DescripcionBlock, { html: descriptionHtml(null, f.provider), heading: "Descripción" }))).toBe("");
  });

  it("REQ-10819: itinerario por día; sin días no pinta nada", () => {
    expect(r(createElement(ItinerarioBlock, { days: itineraryDays(f.itinerary, f.lang), heading: contentHeading("itinerario", f.lang) }))).toBe("");
    const out = r(createElement(ItinerarioBlock, { days: itineraryDays([{ day: 1, title: "Lima", text: "Llegada." }, { day: 2, title: null, text: "Cusco." }], "es"), heading: contentHeading("itinerario", "es") }));
    expect(out.match(/data-dia=/g)).toHaveLength(2);
    expect(out).toContain("Día 2");
  });
});
