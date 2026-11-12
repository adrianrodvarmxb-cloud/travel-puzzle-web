import { describe, it, expect } from "vitest";
import { parseExtraFilters, extraFiltersToParams, countActive, EMPTY_EXTRA, categoryGroupOf, CATEGORY_GROUPS, groupLabel } from "./extra-filters";

const today = "2026-11-05";
describe("REQ-056 filtros estilo Civitatis en la URL", () => {
  it("REQ-056: lee y escribe todos los filtros; descarta valores inválidos", () => {
    const q = new URLSearchParams("idioma=en&fecha=2026-11-10&tipo_act=barcos,gastronomia,xx&cancelacion=1&privado=1&recogida=1&novedad=1&durmin=60&durmax=240");
    const f = parseExtraFilters(q, today);
    expect(f).toEqual({ guideLanguage: "en", date: "2026-11-10", groups: ["barcos", "gastronomia"], freeCancel: true, privateOnly: true, hotelPickup: true, novelty: true, durMin: 60, durMax: 240, formatos: [], temas: [], atributos: [] }); // REQ-1421 / REQ-1422: campos nuevos vacíos
    expect(extraFiltersToParams(f).toString()).toBe("idioma=en&fecha=2026-11-10&tipo_act=barcos%2Cgastronomia&cancelacion=1&privado=1&recogida=1&novedad=1&durmin=60&durmax=240");
  });
  it("REQ-056: vacío no escribe nada y cuenta 0 filtros", () => {
    expect(parseExtraFilters(new URLSearchParams(""), today)).toEqual(EMPTY_EXTRA);
    expect(extraFiltersToParams(EMPTY_EXTRA).toString()).toBe("");
    expect(countActive(EMPTY_EXTRA)).toBe(0);
    expect(countActive({ ...EMPTY_EXTRA, groups: ["barcos", "entradas"], freeCancel: true })).toBe(3);
  });
  it("REQ-056: duración negativa o al revés se ignora", () => {
    expect(parseExtraFilters(new URLSearchParams("durmin=300&durmax=60"), today)).toMatchObject({ durMin: null, durMax: null });
  });
});

describe("REQ-051 tipo de actividad (categorías de Freetour agrupadas como Civitatis)", () => {
  it("REQ-051: cada una de las 29 categorías cae en un grupo", () => {
    const ids = [3, 4, 5, 7, 8, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35];
    for (const id of ids) expect(CATEGORY_GROUPS.map((g) => g.id)).toContain(categoryGroupOf(id));
    expect(categoryGroupOf(12)).toBe("visitas");
    expect(categoryGroupOf(3)).toBe("barcos");
    expect(categoryGroupOf(29)).toBe("transporte");
    expect(categoryGroupOf(null)).toBe("otros");
    expect(categoryGroupOf(999)).toBe("otros");
  });
  it("REQ-051: nombres en los 6 idiomas", () => {
    for (const g of CATEGORY_GROUPS) for (const l of ["es", "en", "pt", "de", "fr", "it"]) expect(groupLabel(g.id, l).length).toBeGreaterThan(2);
    expect(groupLabel("visitas", "es")).toBe("Visitas guiadas y Pieza libre"); // REQ-271
  });
});

describe("REQ-051 tipo de actividad de los viajes propios", () => {
  it("REQ-051: circuitos → varios días; transporte → transporte; por categoría del gestor", async () => {
    const { ownTripGroup } = await import("./extra-filters");
    expect(ownTripGroup("circuito", null)).toBe("varios-dias");
    expect(ownTripGroup("transporte", null)).toBe("transporte");
    expect(ownTripGroup("tour", "gastronomico")).toBe("gastronomia");
    expect(ownTripGroup("tour", "aventura")).toBe("experiencias");
    expect(ownTripGroup("tour", "ecoturismo")).toBe("excursiones");
    expect(ownTripGroup("tour", "cultural")).toBe("visitas");
    expect(ownTripGroup("tour", null)).toBe("otros");
  });
});
