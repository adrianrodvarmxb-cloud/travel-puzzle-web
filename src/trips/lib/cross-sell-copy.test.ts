import { describe, expect, it } from "vitest";
import { advisorTextWithExtras, crossSellCopy, shouldOfferSheet } from "./cross-sell-copy";

describe("advisorTextWithExtras", () => {
  const base = "Hola Travel Puzzle, quiero apartar el tour «Montmartre».";
  it("REQ-006: si acepta, el mensaje al asesor incluye el transporte", () => {
    expect(advisorTextWithExtras(base, ["Autobús turístico hop-on hop-off en París"], "es"))
      .toBe(`${base} También me interesa: «Autobús turístico hop-on hop-off en París».`);
    expect(advisorTextWithExtras("Hi", ["Bus"], "en")).toBe("Hi I'm also interested in: «Bus».");
  });
  it("REQ-006: si dice que no (sin extras), el mensaje queda igual", () => {
    expect(advisorTextWithExtras(base, [], "es")).toBe(base);
  });
});

describe("shouldOfferSheet", () => {
  it("REQ-006: se ofrece solo si hay transporte y no lo rechazó en esta visita", () => {
    expect(shouldOfferSheet(2, false)).toBe(true);
    expect(shouldOfferSheet(0, false)).toBe(false);
    expect(shouldOfferSheet(2, true)).toBe(false);
  });
});

describe("crossSellCopy", () => {
  it("REQ-008: textos en los 6 idiomas, con respaldo en inglés", () => {
    for (const l of ["es", "en", "pt", "fr", "de", "it"]) {
      const c = crossSellCopy(l);
      expect(c.sheetTitle("París")).toContain("París");
      expect(c.noThanks.length).toBeGreaterThan(3);
    }
    expect(crossSellCopy("xx").noThanks).toBe(crossSellCopy("en").noThanks);
  });
});
