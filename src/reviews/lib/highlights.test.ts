import { describe, it, expect } from "vitest";
import { isTravelerFavorite, snippet, pickHighlights, pickDistinctTourReviews, type TourReview } from "./highlights";

const r = (id: number, tour: number, rate: number, language: string, content: string | null, days = 0): TourReview => ({
  id,
  tourExternalId: tour,
  reviewerName: `R${id}`,
  language,
  title: null,
  content,
  rate,
  addedAt: new Date(Date.UTC(2026, 9, 30) - days * 86400000),
});

describe("etiqueta Favorito de los viajeros", () => {
  it("REQ-098: misma regla que src/tours/lib/favorite.ts (4.9 o más y 180 reseñas o más)", () => {
    expect(isTravelerFavorite(4.9, 180)).toBe(true);
    expect(isTravelerFavorite("4.93", 12703)).toBe(true);
    expect(isTravelerFavorite(4.89, 5000)).toBe(false);
    expect(isTravelerFavorite(5, 179)).toBe(false);
    expect(isTravelerFavorite(null, 500)).toBe(false);
  });
});

describe("frase destacada", () => {
  it("usa la primera oración si es corta", () => {
    expect(snippet("El mejor tour de Budapest. Duncan es genial y muy divertido.")).toBe("El mejor tour de Budapest.");
  });
  it("corta sin romper palabras y agrega puntos suspensivos", () => {
    const s = snippet("Una experiencia increíble recorriendo cada rincón de la ciudad con un guía que sabía muchísimo de historia y arquitectura local", 60);
    expect(s.length).toBeLessThanOrEqual(61);
    expect(s.endsWith("…")).toBe(true);
    expect(s).not.toMatch(/\s…$/);
  });
  it("limpia saltos de línea y espacios", () => {
    expect(snippet("  Genial\r\n\r\ntour  ")).toBe("Genial tour");
  });
});

describe("frase por tour", () => {
  it("una por tour, de 5 estrellas, prefiriendo el idioma del visitante y la más reciente", () => {
    const out = pickHighlights(
      [
        r(1, 10, 5, "English", "Great tour with amazing views.", 1),
        r(2, 10, 5, "Spanish", "Tour increíble, muy recomendable.", 5),
        r(3, 10, 4, "Spanish", "Bueno pero largo, lo recomiendo.", 0),
        r(4, 20, 5, "English", "Fantastic guide, loved every minute.", 2),
        r(5, 30, 5, "Spanish", "ok", 0),
      ],
      "es"
    );
    expect(out.get(10)?.text).toBe("Tour increíble, muy recomendable.");
    expect(out.has(20)).toBe(false); // solo hay reseña en inglés: sin frase para un visitante en español
    expect(out.has(30)).toBe(false);
  });
});

describe("frase en el idioma del visitante", () => {
  it("en inglés sí sale la reseña en inglés", () => {
    expect(pickHighlights([r(4, 20, 5, "English", "Fantastic guide, loved every minute.", 2)], "en").get(20)?.text).toBe("Fantastic guide, loved every minute.");
  });
});

describe("reseñas del inicio", () => {
  it("de 5 estrellas y de tours distintos", () => {
    const out = pickDistinctTourReviews(
      [r(1, 10, 5, "Spanish", "Excelente recorrido por la ciudad", 0), r(2, 10, 5, "Spanish", "Otro excelente tour del mismo guía", 1), r(3, 20, 5, "English", "Wonderful walk around the old town", 2), r(4, 30, 4, "Spanish", "Bueno en general, lo recomiendo", 0)],
      "es",
      3
    );
    expect(out.map((x) => x.id)).toEqual([1, 3]);
  });
});
