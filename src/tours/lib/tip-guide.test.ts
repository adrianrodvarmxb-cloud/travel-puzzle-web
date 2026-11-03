import { describe, it, expect } from "vitest";
import { tipRegion, tipGuide, FREE_TOUR_LABEL } from "./tip-guide";

describe("guía de propina del free tour", () => {
  it("se llama free tour en todos los idiomas", () => {
    expect(FREE_TOUR_LABEL).toBe("Free tour");
  });
  it("región por país", () => {
    expect(tipRegion("ES")).toBe("europa");
    expect(tipRegion("hu")).toBe("europa");
    expect(tipRegion("US")).toBe("norteamerica");
    expect(tipRegion("CA")).toBe("norteamerica");
    expect(tipRegion("MX")).toBe("latam");
    expect(tipRegion("AR")).toBe("latam");
    expect(tipRegion("JP")).toBe("otros");
    expect(tipRegion(null)).toBe("otros");
  });
  it("monto sugerido por región y consejos", () => {
    expect(tipGuide("FR", "es").amount).toBe("€10 a €15 por persona (€20 o más si fue excepcional)");
    expect(tipGuide("US", "es").amount).toBe("$10 a $20 USD por persona");
    expect(tipGuide("PE", "es").amount).toBe("el equivalente a $5 a $10 USD por persona, en moneda local");
    expect(tipGuide("JP", "es").amount).toBeNull();
    const g = tipGuide("ES", "es");
    expect(g.tips).toEqual(["Paga en efectivo al terminar el recorrido.", "Lleva billetes chicos o cambio."]);
    expect(g.intro).toMatch(/no cuesta/);
    expect(tipGuide("ES", "en").amount).toBe("€10 to €15 per person (€20+ if it was exceptional)");
  });
  it("nunca menciona al proveedor", () => {
    for (const l of ["es", "en"]) expect(JSON.stringify(tipGuide("ES", l))).not.toMatch(/freetour\.com|FREETOUR/);
  });
});
