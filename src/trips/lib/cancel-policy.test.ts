import { describe, it, expect } from "vitest";
import { policySummary } from "./cancel-policy";

describe("REQ-040: política de cancelación de cada ficha (como Civitatis/GetYourGuide)", () => {
  it("REQ-040: estándar = gratuita hasta 24 h; sin reembolso = no reembolsable", () => {
    expect(policySummary({ type: "standard", tiers: [] })).toEqual({ kind: "free", hours: 24 });
    expect(policySummary({ type: "none", tiers: [] })).toEqual({ kind: "none" });
  });
  it("REQ-040: personalizada: gratuita hasta el menor plazo con 100% de reembolso", () => {
    const tiers = [{ daysBefore: 62, refundPct: 100 }, { daysBefore: 30, refundPct: 70 }, { daysBefore: 15, refundPct: 50 }, { daysBefore: 7, refundPct: 20 }, { daysBefore: 3, refundPct: 0 }];
    expect(policySummary({ type: "custom", tiers })).toEqual({ kind: "free", days: 62 });
    expect(policySummary({ type: "custom", tiers: [{ daysBefore: 10, refundPct: 100 }, { daysBefore: 30, refundPct: 100 }] })).toEqual({ kind: "free", days: 10 });
  });
  it("REQ-040: personalizada sin 100%: parcial si algún escalón devuelve algo; si no, no reembolsable", () => {
    expect(policySummary({ type: "custom", tiers: [{ daysBefore: 30, refundPct: 50 }] })).toEqual({ kind: "partial" });
    expect(policySummary({ type: "custom", tiers: [{ daysBefore: 30, refundPct: 0 }] })).toEqual({ kind: "none" });
    expect(policySummary({ type: "custom", tiers: [] })).toEqual({ kind: "none" });
  });
});

describe("REQ-040: texto corto de la política", () => {
  it("REQ-040: usa los textos del idioma de la ficha", async () => {
    const { tripCopy } = await import("./copy");
    const { policyText } = await import("./cancel-policy");
    const es = tripCopy("es"), en = tripCopy("en");
    expect(policyText({ kind: "free", days: 62 }, es)).toBe("Cancelación gratuita hasta 62 días antes");
    expect(policyText({ kind: "free", hours: 24 }, en)).toBe("Free cancellation up to 24 h before");
    expect(policyText({ kind: "none" }, es)).toBe("No reembolsable");
    expect(policyText({ kind: "partial" }, tripCopy("pt"))).toBe("Reembolso parcial conforme a antecedência");
  });
});
