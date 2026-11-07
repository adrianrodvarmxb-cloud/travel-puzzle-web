import { describe, expect, it } from "vitest";
import { hubCopy } from "./hub-copy";

// Auditoría 7 nov 2026 (D10): «El nombre del tipo es «Pieza libre» (…sección de ciudad, intro…). En inglés: «Free tour»».
// En producción, /en/destinos/mx/ciudad-de-mexico decía «Pieza libre (La Primera Pieza)» y «38 in Pieza libre and 39 tours…».
describe("Nombre de la categoría en la página de ciudad en inglés (REQ-1102)", () => {
  it("REQ-1102: la sección se llama «Free tour (La Primera Pieza)» en inglés, sin «Pieza libre»", () => {
    expect(hubCopy("en").freeSection).toBe("Free tour (La Primera Pieza)");
  });

  it("REQ-1102: la intro de la ciudad en inglés dice «N free tours», sin «Pieza libre»", () => {
    expect(hubCopy("en").cityFreeIntro("Mexico City", 38, 39)).toBe("38 free tours and 39 tours with local guides in Mexico City.");
    expect(hubCopy("en").cityFreeIntro("Lima", 1, 1)).toBe("1 free tour and 1 tour with local guides in Lima.");
  });

  it("REQ-1102: ningún texto en inglés de los hubs dice «Pieza libre»", () => {
    const en = hubCopy("en");
    const texts = [en.freeSection, en.freeSubtitle, en.cityFreeIntro("X", 2, 3), en.countryIntro("X"), en.destinosIntro];
    for (const t of texts) expect(t).not.toMatch(/Pieza libre/);
  });

  it("REQ-1102: el español no cambia (REQ-271)", () => {
    expect(hubCopy("es").freeSection).toBe("Pieza libre (La Primera Pieza)");
    expect(hubCopy("es").cityFreeIntro("Barcelona", 67, 35)).toBe("67 en Pieza libre y 35 tours con guías locales en Barcelona.");
  });
});
