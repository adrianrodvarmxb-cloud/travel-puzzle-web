import { describe, expect, it } from "vitest";
import { homeCopy } from "./copy";
import { REVIEWS_SHOW_AVERAGE, shownReviewsAverage } from "./reviews-display";

// REQ-3321: el promedio agregado («4.8 ★») no se muestra en «Lo que dicen» de la portada (decisión del PO, 12 nov 2026).
describe("REQ-3321 la portada no muestra un promedio agregado de reseñas", () => {
  it("REQ-3321: con el interruptor apagado, ningún promedio llega a la pantalla", () => {
    expect(REVIEWS_SHOW_AVERAGE).toBe(false);
    expect(shownReviewsAverage(4.8)).toBeNull();
    expect(shownReviewsAverage(null)).toBeNull();
  });
  it("REQ-3321: el interruptor es reversible: encendido, deja pasar solo promedios válidos (1 a 5)", () => {
    expect(shownReviewsAverage(4.8, true)).toBe(4.8);
    expect(shownReviewsAverage(0, true)).toBeNull();
    expect(shownReviewsAverage(5.1, true)).toBeNull();
    expect(shownReviewsAverage(Number.NaN, true)).toBeNull();
    expect(shownReviewsAverage(null, true)).toBeNull();
  });
});

// REQ-3322: aviso visible de origen y selección de las reseñas (LFPC art. 32: información clara y no parcial;
// práctica UE: decir cómo se obtienen y que es una selección). Sin nombrar al proveedor (REQ-453, C3).
describe("REQ-3322 la sección de reseñas dice de dónde salen y que es una selección", () => {
  it("REQ-3322: es — selección de 5 estrellas, quién las escribe, que no se editan y dónde ver la calificación de cada experiencia (REQ-173: sin «tour» genérico)", () => {
    const d = homeCopy("es").reviewsDisclosure;
    expect(d).toMatch(/selección/i);
    expect(d).toMatch(/5 estrellas/);
    expect(d).toMatch(/no las escribe ni las edita/);
    expect(d).toMatch(/página de cada experiencia/);
  });
  it("REQ-3322: en — mismo contenido", () => {
    const d = homeCopy("en").reviewsDisclosure;
    expect(d).toMatch(/selection/i);
    expect(d).toMatch(/5-star/);
    expect(d).toMatch(/does not write or edit/);
    expect(d).toMatch(/each experience's page/);
  });
  it("REQ-3322: no nombra al proveedor ni promete verificación que no hacemos", () => {
    for (const lang of ["es", "en"]) {
      const d = homeCopy(lang).reviewsDisclosure;
      expect(d).not.toMatch(/freetour/i);
      expect(d).not.toMatch(/verificad|verified/i);
    }
  });
});
