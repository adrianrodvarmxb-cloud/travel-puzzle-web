import { describe, it, expect } from "vitest";
import { isTravelerFavorite, operatedBy, FAVORITE_MIN_RATING, FAVORITE_MIN_REVIEWS } from "./favorite";

describe("REQ-098: Favorito con criterio real y «Operado por un guía local»", () => {
  it("REQ-098: criterio firmado (gate 2): calificación ≥4.7 y ≥50 reseñas", () => {
    expect(FAVORITE_MIN_RATING).toBe(4.7);
    expect(FAVORITE_MIN_REVIEWS).toBe(50);
    expect(isTravelerFavorite({ rating: 4.7, reviews: 50 })).toBe(true);
    expect(isTravelerFavorite({ rating: "4.83", reviews: 12703 })).toBe(true);
    expect(isTravelerFavorite({ rating: 4.69, reviews: 500 })).toBe(false);
    expect(isTravelerFavorite({ rating: 5, reviews: 49 })).toBe(false);
    expect(isTravelerFavorite({ rating: null, reviews: 100 })).toBe(false);
  });
  it("REQ-098: «Operado por un guía local · {proveedor}»", () => {
    expect(operatedBy("Lima Walking Tours", "es")).toBe("Operado por un guía local · Lima Walking Tours");
    expect(operatedBy("Lima Walking Tours", "en")).toBe("Run by a local guide · Lima Walking Tours");
    expect(operatedBy("  ", "es")).toBe("Operado por un guía local");
  });
  it("REQ-098: nunca menciona FREETOUR, aunque el nombre del proveedor lo traiga", () => {
    for (const p of ["FREETOUR.com", "Freetour Lisboa", "freetour.com Team"]) {
      const s = operatedBy(p, "es");
      expect(s).not.toMatch(/freetour/i);
      expect(s).toBe("Operado por un guía local");
    }
    expect(operatedBy("Free Tour Lima", "es")).toBe("Operado por un guía local · Free Tour Lima");
  });
});
