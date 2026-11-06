import { describe, it, expect } from "vitest";
import { mentionsProviderBrand, anyTitleMentionsProviderBrand } from "./provider-brand";

describe("REQ-189: carruseles del inicio sin títulos que digan FreeTour o «free tour»", () => {
  it("REQ-189: detecta FreeTour, FREETOUR, free tour, free-tour, freetours y freetour.com", () => {
    for (const t of ["FreeTour Budapest", "FREETOUR por Lima", "Free Tour de Budapest", "El original free tour de Berlín", "Free-tour Madrid", "Best freetours", "freetour.com walk", "FREE  TOURS in Rome"]) {
      expect(mentionsProviderBrand(t), t).toBe(true);
    }
  });
  it("REQ-189: no confunde otras palabras", () => {
    for (const t of ["Excursión a Toledo desde Madrid", "Tour gratis por el centro", "Duty-free shopping tour", "Freedom tour Berlin", "Carefree touring", ""]) {
      expect(mentionsProviderBrand(t), t).toBe(false);
    }
  });
  it("REQ-189: basta con que un título en cualquier idioma lo diga", () => {
    expect(anyTitleMentionsProviderBrand({ es: "Recorrido por Praga", en: "Prague Free Tour" })).toBe(true);
    expect(anyTitleMentionsProviderBrand(["Recorrido por Praga", null, undefined])).toBe(false);
  });
});
