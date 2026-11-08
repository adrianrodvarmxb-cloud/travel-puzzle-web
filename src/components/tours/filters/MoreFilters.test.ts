import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MoreFilters } from "./MoreFilters";
import { EMPTY_EXTRA } from "@/tours/lib/extra-filters";
import { TIPO_EN_PANEL } from "@/tours/lib/filters-visibility";

const counts = { "pieza-libre": 3475, caminata: 1626 };
const render = (props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(MoreFilters, { value: EMPTY_EXTRA, onChange: () => {}, today: "2026-11-08", lang: "es", taxonomy: true, formatCounts: counts, ...props }));

describe("MoreFilters", () => {
  it("REQ-1420: «Tipo de experiencia» ya no se repite en el panel (se queda en los chips de arriba)", () => {
    expect(TIPO_EN_PANEL).toBe(false);
    const h = render();
    expect(h).not.toContain("Tipo de experiencia");
    expect(h).not.toContain("Pieza libre (3475)");
  });

  it("REQ-1420: es reversible: con tipoEnPanel vuelve la sección con sus conteos", () => {
    const h = render({ tipoEnPanel: true });
    expect(h).toContain("Tipo de experiencia");
    expect(h).toContain("Pieza libre (3475)");
  });

  it("REQ-1420: el resto del panel no cambia (características, precio y duración)", () => {
    const h = render({ onPrice: () => {}, priceLabel: "Precio" });
    for (const s of ["Cancelación gratuita", "Precio"]) expect(h).toContain(s);
  });
});
