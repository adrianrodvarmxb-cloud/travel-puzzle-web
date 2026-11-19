import { describe, expect, it } from "vitest";
import { titleView } from "./title";

const base = { title: "Glaciar Perito Moreno", provider: "ejemplo", lang: "es" as const };

describe("titleView", () => {
  it("REQ-10810: nota y conteo en el idioma; sin «Favorito» por debajo de 4.9 y 180", () => {
    expect(titleView({ ...base, rating: { value: 4.5, count: 45, favorite: false } })).toEqual({
      title: "Glaciar Perito Moreno", rating: { value: "4.5", reviews: "45 reseñas" }, favorite: null,
    });
    expect(titleView({ ...base, rating: { value: 4.9, count: 179, favorite: true } }).favorite).toBeNull();
  });

  it("REQ-10810: «Favorito» solo con 4.9 y 180 reseñas, en el idioma de la ficha", () => {
    expect(titleView({ ...base, rating: { value: 4.9, count: 180, favorite: true } }).favorite).toBe("Favorito de los viajeros");
    expect(titleView({ ...base, lang: "en", rating: { value: 4.95, count: 300, favorite: true } })).toEqual({
      title: "Glaciar Perito Moreno", rating: { value: "5.0", reviews: "300 reviews" }, favorite: "Traveler favorite",
    });
  });

  it("REQ-10810: la nota de Tangol no se muestra aunque llegue; sin nota no hay estrellas", () => {
    expect(titleView({ ...base, provider: "tangol", rating: { value: 4.9, count: 500, favorite: true } })).toEqual({ title: base.title, rating: null, favorite: null });
    expect(titleView({ ...base, rating: null }).rating).toBeNull();
    expect(titleView({ ...base, rating: { value: null, count: 10, favorite: false } }).rating).toBeNull();
    expect(titleView({ ...base, rating: { value: 4.2, count: 0, favorite: false } }).rating).toBeNull();
  });
});
