import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { homeCopy } from "./copy";

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

// REQ-3322: el aviso no puede quedar dentro del carrusel horizontal del celular (ahí solo se ve al deslizar hasta el final).
describe("REQ-3322 el aviso se pinta fuera del carrusel", () => {
  it("REQ-3322: aparece una sola vez y antes de <MobileRail>", () => {
    const src = readFileSync("src/components/home/v2/HomeReviews.tsx", "utf8");
    expect(src.split("c.reviewsDisclosure").length - 1).toBe(1);
    expect(src.indexOf("c.reviewsDisclosure")).toBeGreaterThan(-1);
    expect(src.indexOf("c.reviewsDisclosure")).toBeLessThan(src.indexOf("<MobileRail"));
  });
});
