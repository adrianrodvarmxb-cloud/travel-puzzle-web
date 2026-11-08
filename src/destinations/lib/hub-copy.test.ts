import { describe, expect, it } from "vitest";
import { hubCopy } from "./hub-copy";

// REQ-1102 (auditoría 7-11, «en inglés Free tour») quedó REEMPLAZADO por REQ-1103 (PO, 7 nov 2026, 06:06):
// «Pieza libre es la categoría que Travel Puzzle le da a los free tours, por lo tanto en la página en inglés debe decir
// Categoría: Free Puzzle». La colección «La Primera Pieza» no cambia.
describe("Nombre de la categoría en la página de ciudad en inglés (REQ-1103, reemplaza a REQ-1102)", () => {
  it("REQ-1103: la sección se llama «Free Puzzle (La Primera Pieza)» en inglés", () => {
    expect(hubCopy("en").freeSection).toBe("Free Puzzle (La Primera Pieza)");
  });

  it("REQ-1103: la intro de la ciudad en inglés dice «N in Free Puzzle», como «N en Pieza libre» en español", () => {
    expect(hubCopy("en").cityFreeIntro("Mexico City", 38, 39)).toBe("38 in Free Puzzle and 39 tours with local guides in Mexico City.");
    expect(hubCopy("en").cityFreeIntro("Lima", 1, 1)).toBe("1 in Free Puzzle and 1 tour with local guides in Lima.");
  });

  it("REQ-1103: ningún texto en inglés de los hubs dice «Pieza libre»", () => {
    const en = hubCopy("en");
    const texts = [en.freeSection, en.freeSubtitle, en.cityFreeIntro("X", 2, 3), en.countryIntro("X"), en.destinosIntro];
    for (const t of texts) expect(t).not.toMatch(/Pieza libre/);
  });

  it("REQ-1103: el español no cambia (REQ-271)", () => {
    expect(hubCopy("es").freeSection).toBe("Pieza libre (La Primera Pieza)");
    expect(hubCopy("es").cityFreeIntro("Barcelona", 67, 35)).toBe("67 en Pieza libre y 35 tours con guías locales en Barcelona.");
  });
});
