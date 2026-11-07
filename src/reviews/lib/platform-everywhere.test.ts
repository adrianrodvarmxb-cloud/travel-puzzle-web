import { describe, it, expect } from "vitest";
import { pickDistinctTourReviews, pickHighlights, type TourReview } from "./highlights";
import { pickReviews } from "./reviews";

const r = (id: number, tour: number, content: string, days = 0, title: string | null = null): TourReview => ({
  id, tourExternalId: tour, reviewerName: `R${id}`, language: "Spanish", title, content, rate: 5,
  addedAt: new Date(Date.UTC(2026, 9, 30) - days * 86400000),
});

describe("REQ-171: reseñas que nombran la plataforma, fuera también de frases destacadas e inicio (PO, 6 nov 2026)", () => {
  it("REQ-171: la frase destacada de una tarjeta salta la reseña que dice «Freetour» y usa la siguiente", () => {
    const m = pickHighlights([r(1, 10, "Lo reservé en FreeTour y la guía fue excelente."), r(2, 10, "La guía fue excelente, muy recomendable.", 1)], "es");
    expect(m.get(10)?.text).toBe("La guía fue excelente, muy recomendable.");
  });
  it("REQ-171: «el mejor free tour» (categoría genérica) sí puede ser frase destacada", () => {
    expect(pickHighlights([r(1, 10, "Fue el mejor free tour de mi viaje a Lima.")], "es").get(10)?.text).toBe("Fue el mejor free tour de mi viaje a Lima.");
  });
  it("REQ-171: las reseñas del inicio (una por tour) no traen menciones, ni en el título", () => {
    const out = pickDistinctTourReviews([r(1, 10, "Excelente experiencia con la guía", 0, "Gracias freetour.com"), r(2, 11, "vía free tour .com, todo excelente"), r(3, 12, "Excelente experiencia con la guía")], "es", 6);
    expect(out.map((x) => x.id)).toEqual([3]);
  });
  it("REQ-171: pickReviews (ficha e inicio clásico) descarta las menciones antes de aplicar el límite", () => {
    const out = pickReviews([r(1, 10, "Por FREETOURS, bien"), r(2, 10, "Muy bien", 1), r(3, 10, "Excelente", 2)], { lang: "es", limit: 2 });
    expect(out.map((x) => x.id)).toEqual([2, 3]);
  });
});
