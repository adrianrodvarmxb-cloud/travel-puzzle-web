import { describe, expect, it } from "vitest";
import { isBookingsEnabled, paidInRecommendations } from "./flags";

describe("flags", () => {
  it("solo 'true' enciende", () => {
    expect(isBookingsEnabled("true")).toBe(true);
    expect(isBookingsEnabled("1")).toBe(false);
  });
  it("REQ-014: el piloto de pago NO mete tours de pago en recomendaciones; eso tiene su propia bandera", () => {
    expect(paidInRecommendations({ PAID_TOURS_ENABLED: "true" })).toBe(false);
    expect(paidInRecommendations({ PAID_TOURS_ENABLED: "true", PAID_TOURS_IN_RECOMMENDATIONS: "true" })).toBe(true);
    expect(paidInRecommendations({ PAID_TOURS_IN_RECOMMENDATIONS: "true" })).toBe(false);
  });
});
