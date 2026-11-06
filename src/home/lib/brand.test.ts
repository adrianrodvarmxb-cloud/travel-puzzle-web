import { describe, it, expect } from "vitest";
import { mentionsProviderBrand, titlesMentionBrand } from "./brand";

describe("REQ-219: en el inicio no se muestra nada cuyo título diga FreeTour / Free Tour (PO, 6 nov 2026)", () => {
  it("REQ-219: detecta la marca en cualquier forma (FreeTour, FREETOUR, FreeTour.com, Free Tour, free tour, free-tour, con acento)", () => {
    for (const t of ["FreeTour a Pie por Shinjuku", "FREETOUR Madrid", "Reserva en FreeTour.com", "Free Tour de Budapest", "el mejor free tour de Lima", "Free-Tour Praga", "FREE TOURS Roma", "Frée Tour Lyon"]) {
      expect(mentionsProviderBrand(t), t).toBe(true);
    }
  });
  it("REQ-219: no confunde títulos sin la marca", () => {
    for (const t of ["Recorrido gratuito por el centro", "Tour «Santo Ring: Lucha Libre y Pulque»", "Freedom Trail tour", "Tour en bici", "", null, undefined]) {
      expect(mentionsProviderBrand(t as string), String(t)).toBe(false);
    }
  });
  it("REQ-219: un tour se excluye si su título en cualquier idioma lleva la marca", () => {
    expect(titlesMentionBrand({ es: "Recorrido por Shinjuku", en: "FreeTour Shinjuku" })).toBe(true);
    expect(titlesMentionBrand(["Recorrido por Shinjuku", "Shinjuku walk"])).toBe(false);
  });
});
