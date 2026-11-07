import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FILTERS_DESKTOP_CLASS } from "./filters-layout";
import { FiltersSheet } from "@/components/tours/filters/FiltersSheet";

describe("REQ-530: columna de filtros de /tours con scroll propio", () => {
  it("REQ-530: en escritorio es sticky bajo el header, con alto máximo de la ventana y overflow-y propio", () => {
    for (const c of ["lg:sticky", "lg:top-24", "lg:max-h-[calc(100vh-7rem)]", "lg:overflow-y-auto", "lg:overscroll-contain"]) expect(FILTERS_DESKTOP_CLASS).toContain(c);
    expect(FILTERS_DESKTOP_CLASS.startsWith("hidden ")).toBe(true); // celular: oculta hasta abrir la hoja (REQ-056)
  });

  it("REQ-530: FiltersSheet cerrado usa esas clases; abierto (celular) sigue siendo la hoja a pantalla completa", () => {
    const props = { onClose: () => {}, onClear: () => {}, count: 3, lang: "es", children: createElement("p", null, "x") };
    expect(renderToStaticMarkup(createElement(FiltersSheet, { ...props, open: false }))).toContain(`class="${FILTERS_DESKTOP_CLASS}"`);
    const open = renderToStaticMarkup(createElement(FiltersSheet, { ...props, open: true }));
    expect(open).toContain("fixed inset-0 z-[60]");
    expect(open).toContain('role="dialog"');
  });

  it("REQ-530: el contenido ya no anula el scroll en escritorio (sin lg:overflow-visible)", () => {
    const html = renderToStaticMarkup(createElement(FiltersSheet, { onClose: () => {}, onClear: () => {}, count: 0, lang: "es", open: false, children: null }));
    expect(html).not.toContain("lg:overflow-visible");
  });
});
