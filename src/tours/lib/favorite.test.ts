import { describe, it, expect } from "vitest";
import { isTravelerFavorite, operatedBy, FAVORITE_MIN_RATING, FAVORITE_MIN_REVIEWS } from "./favorite";

describe("REQ-098: Favorito con criterio real y «Operado por un guía local»", () => {
  it("REQ-098 (gate actualizado por el PO, 6 nov 2026, 14:02): calificación ≥4.9 y ≥180 reseñas (~140 tours)", () => {
    expect(FAVORITE_MIN_RATING).toBe(4.9);
    expect(FAVORITE_MIN_REVIEWS).toBe(180);
    expect(isTravelerFavorite({ rating: 4.9, reviews: 180 })).toBe(true);
    expect(isTravelerFavorite({ rating: "4.93", reviews: 12703 })).toBe(true);
    expect(isTravelerFavorite({ rating: 4.89, reviews: 5000 })).toBe(false);
    expect(isTravelerFavorite({ rating: 5, reviews: 179 })).toBe(false);
    expect(isTravelerFavorite({ rating: 4.78, reviews: 12706 })).toBe(false);
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

  it("REQ-098: una sola fuente de la regla: highlights.ts reexporta las mismas constantes", async () => {
    const h = await import("@/reviews/lib/highlights");
    expect(h.FAVORITE_MIN_RATING).toBe(FAVORITE_MIN_RATING);
    expect(h.FAVORITE_MIN_REVIEWS).toBe(FAVORITE_MIN_REVIEWS);
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/reviews/lib/highlights.ts", "utf8");
    expect(src).not.toMatch(/FAVORITE_MIN_(RATING|REVIEWS)\s*=\s*\d/);
  });
});
