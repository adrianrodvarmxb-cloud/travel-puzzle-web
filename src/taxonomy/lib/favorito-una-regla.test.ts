/**
 * REQ-1248 (PO, 7 nov 2026, 08:14): «★ Favorito» usa en todo el sitio ≥4.9 estrellas y ≥180 reseñas (D13).
 * Reemplaza el gate G-T1 «A» (≥4.7 y ≥50): una sola regla, la de src/tours/lib/favorite.ts.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { classify } from "./classify";
import { esFavorito } from "./attributes";
import { DEFAULT_GATES, FAVORITO_CRITERIO, GATE_GT1_FAVORITO } from "./gates";
import { FAVORITE_MIN_RATING, FAVORITE_MIN_REVIEWS, isTravelerFavorite } from "@/tours/lib/favorite";
import { isTravelerFavorite as highlightsFavorite } from "@/reviews/lib/highlights";

const casos: [number, number][] = [[4.9, 180], [5, 5000], [4.89, 9999], [4.9, 179], [4.7, 50], [4.8, 500], [0, 0]];

describe("REQ-1248 una sola regla de «★ Favorito» (≥4.9 y ≥180)", () => {
  it("REQ-1248 el gate de la taxonomía es la regla del sitio", () => {
    expect([FAVORITE_MIN_RATING, FAVORITE_MIN_REVIEWS]).toEqual([4.9, 180]);
    expect(GATE_GT1_FAVORITO).toBe("D");
    expect(DEFAULT_GATES.favorito).toBe("D");
    expect(FAVORITO_CRITERIO.D).toEqual({ minCalificacion: FAVORITE_MIN_RATING, minResenas: FAVORITE_MIN_REVIEWS });
  });
  it("REQ-1248 tarjeta, reseñas destacadas y clasificador dan lo mismo en cada caso", () => {
    for (const [rating, reviews] of casos) {
      const tarjeta = isTravelerFavorite({ rating, reviews });
      expect(highlightsFavorite(rating, reviews)).toBe(tarjeta);
      expect(esFavorito({ calificacion: rating, resenas: reviews }, DEFAULT_GATES.favorito)).toBe(tarjeta);
      const r = classify({ proveedor: "freetour", categoriaId: 12, precio: 0, titulo: "x", calificacion: rating, resenas: reviews }, D, M);
      expect(r.atributos.includes("favorito")).toBe(tarjeta);
    }
    expect(isTravelerFavorite({ rating: 4.7, reviews: 50 })).toBe(false); // el gate viejo ya no da la insignia
  });
});
