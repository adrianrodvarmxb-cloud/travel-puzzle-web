import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FichaMeetingMap } from "./FichaMeetingMap";
import { PuntoEncuentroBlock } from "./PuntoEncuentroBlock";
import { meetingView, practicalText } from "@/ficha/lib/practical-view";

const r = renderToStaticMarkup;
const T = { heading: practicalText("puntoDeEncuentro", "es"), directions: practicalText("comoLlegar", "es"), zone: practicalText("zona", "es"), zoneNote: practicalText("zonaNota", "es") };

describe("FichaMeetingMap: el mapa de hoy dentro del bloque 11 (ola 7)", () => {
  it("REQ-10860: punto exacto → mapa con pin; zona → círculo; solo texto o nada → sin mapa", () => {
    expect(r(createElement(FichaMeetingMap, { view: meetingView({ kind: "exact", lat: -50.3, lng: -72.2, title: "Muelle" }), label: "Punto" }))).toContain('data-mapa="exact"');
    expect(r(createElement(FichaMeetingMap, { view: meetingView({ kind: "zone", lat: -50.3, lng: -72.2, radiusM: 1500, title: null }), label: "Punto" }))).toContain('data-mapa="zone"');
    expect(r(createElement(FichaMeetingMap, { view: meetingView({ kind: "none", title: "Hotel" }), label: "Punto" }))).toBe("");
    expect(r(createElement(FichaMeetingMap, { view: null, label: "Punto" }))).toBe("");
  });

  it("REQ-10860: el bloque 11 pinta el mapa como children solo cuando hay coordenadas", () => {
    const exact = meetingView({ kind: "exact", lat: -50.3, lng: -72.2, title: "Muelle" });
    const con = r(createElement(PuntoEncuentroBlock, { view: exact, text: T }, createElement(FichaMeetingMap, { view: exact, label: T.heading })));
    expect(con).toContain('data-mapa="exact"');
    const texto = meetingView({ kind: "none", title: "Hotel" });
    const sin = r(createElement(PuntoEncuentroBlock, { view: texto, text: T }, createElement(FichaMeetingMap, { view: texto, label: T.heading })));
    expect(sin).not.toContain("data-mapa");
    expect(sin).toContain("Hotel");
  });
});
