import { describe, expect, it } from "vitest";
import { taxonomyChips, TEMAS_MAX, FREETOUR_ATRIBUTOS_MAX } from "./taxonomy-view";

const t = (slug: string) => ({ slug, label: slug.toUpperCase() });
const tax = { tipo: t("excursion"), temas: [t("naturaleza"), t("glaciares"), t("fotografia"), t("aventura")], atributos: [t("traslado"), t("guia"), t("almuerzo")] };

describe("taxonomía de la ficha única", () => {
  it("REQ-10814: tipo + hasta 3 temas + atributos, sin repetidos", () => {
    const chips = taxonomyChips(tax, "ejemplo");
    expect(TEMAS_MAX).toBe(3);
    expect(chips.map((c) => c.slug)).toEqual(["excursion", "naturaleza", "glaciares", "fotografia", "traslado", "guia", "almuerzo"]);
    expect(chips[0].kind).toBe("tipo");
    expect(taxonomyChips({ ...tax, atributos: [t("excursion"), t("guia")] }, "ejemplo").filter((c) => c.slug === "excursion")).toHaveLength(1);
  });

  it("REQ-10814: FREETOUR, solo tipo y dos atributos (decisión 10); sin datos, nada", () => {
    expect(FREETOUR_ATRIBUTOS_MAX).toBe(2);
    expect(taxonomyChips(tax, "freetour").map((c) => c.slug)).toEqual(["excursion", "traslado", "guia"]);
    expect(taxonomyChips({ tipo: null, temas: [], atributos: [] }, "ejemplo")).toEqual([]);
  });
});
