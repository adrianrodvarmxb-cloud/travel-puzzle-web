import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IncluyeBlock } from "./IncluyeBlock";
import { PuntoEncuentroBlock } from "./PuntoEncuentroBlock";
import { OpcionesBlock } from "./OpcionesBlock";
import { includesView, meetingView, optionCards, practicalText } from "@/ficha/lib/practical-view";
import { fichaEjemplo } from "@/ficha/lib/fixtures";

const f = fichaEjemplo();
const r = renderToStaticMarkup;
const H = { incluye: practicalText("incluye", "es"), noIncluye: practicalText("noIncluye", "es") };
const T = { heading: practicalText("puntoDeEncuentro", "es"), directions: practicalText("comoLlegar", "es"), zone: practicalText("zona", "es"), zoneNote: practicalText("zonaNota", "es") };

describe("Bloques 10, 11 y 12 de la ficha única", () => {
  it("REQ-10828: dos columnas con las dos listas; una sola si falta la otra; nada sin listas", () => {
    expect(r(createElement(IncluyeBlock, { view: includesView(f.includes, f.excludes), headings: H }))).toContain('data-columnas="2"');
    const one = r(createElement(IncluyeBlock, { view: includesView(f.includes, []), headings: H }));
    expect(one).toContain('data-columnas="1"');
    expect(one).not.toContain("No incluye");
    expect(r(createElement(IncluyeBlock, { view: includesView([], []), headings: H }))).toBe("");
  });

  it("REQ-10829: exacto con mapa y «Cómo llegar»; zona sin botón; solo texto sin mapa; sin dato no pinta", () => {
    const map = createElement("div", { "data-mapa": "1" });
    const ex = r(createElement(PuntoEncuentroBlock, { view: meetingView({ kind: "exact", lat: -50.3, lng: -72.2, title: "Muelle" }), text: T }, map));
    expect(ex).toContain("Cómo llegar");
    expect(ex).toContain('data-mapa="1"');
    const zone = r(createElement(PuntoEncuentroBlock, { view: meetingView({ kind: "zone", lat: -50.3, lng: -72.2, radiusM: 1500, title: null }), text: T }, map));
    expect(zone).toContain("Zona aproximada");
    expect(zone).not.toContain("Cómo llegar");
    const txt = r(createElement(PuntoEncuentroBlock, { view: meetingView(f.meeting), text: T }, map));
    expect(txt).toContain("Hoteles céntricos");
    expect(txt).not.toContain("data-mapa");
    expect(r(createElement(PuntoEncuentroBlock, { view: meetingView({ kind: "none", title: null }), text: T }))).toBe("");
  });

  it("REQ-10830: tarjetas por opción con precio final; oculto con una sola opción", () => {
    expect(r(createElement(OpcionesBlock, { cards: optionCards(f.options, f.lang), heading: practicalText("opciones", "es") }))).toBe("");
    const out = r(createElement(OpcionesBlock, {
      cards: optionCards([
        { id: "con", name: "Con traslado desde el hotel", price: { amount: 120, currency: "USD", per: "person" }, transferIncluded: true, startTime: "08:00" },
        { id: "sin", name: "Sin traslado", price: { amount: 98, currency: "USD", per: "person" }, transferIncluded: false, startTime: null },
      ], "es"),
      heading: practicalText("opciones", "es"),
    }));
    expect(out.match(/data-opcion=/g)).toHaveLength(2);
    expect(out).toContain("USD $120 por persona");
    expect(out).toContain("Con traslado · 08:00");
    expect(out).not.toContain("data-precio-local");
  });

  it("REQ-10879: con `localUrl` el precio de cada opción se pinta con el texto del servidor y marcado para que el navegador pida el local", () => {
    const out = r(createElement(OpcionesBlock, {
      cards: optionCards([
        { id: "con", name: "Con traslado", price: { amount: 120, currency: "USD", per: "person" }, transferIncluded: true, startTime: null },
        { id: "sin", name: "Sin traslado", price: { amount: 98, currency: "USD", per: "person" }, transferIncluded: false, startTime: null },
        { id: "libre", name: "Solo guía", price: null, transferIncluded: null, startTime: null },
      ], "es", { localCurrency: true }),
      heading: practicalText("opciones", "es"),
    }));
    expect(out.match(/data-precio-local="servidor"/g)).toHaveLength(2);
    expect(out).toContain("USD $120 por persona");
    expect(out).toContain("USD $98 por persona");
    expect(out).not.toContain("N/D");
  });
});
