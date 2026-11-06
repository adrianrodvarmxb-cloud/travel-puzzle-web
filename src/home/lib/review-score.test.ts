import { describe, it, expect } from "vitest";
import { bayesScore, catalogPrior, hasRealReviews, rankByReviews, diversify, REVIEW_PRIOR_M, REVIEW_PRIOR_C_FALLBACK } from "./review-score";

describe("REQ-185: medidor de reseñas (calificación bayesiana)", () => {
  it("REQ-185: m = 50 y C de respaldo 4.5 (documentados en docs/gates-carruseles-home-2026-11.md)", () => {
    expect(REVIEW_PRIOR_M).toBe(50);
    expect(REVIEW_PRIOR_C_FALLBACK).toBe(4.5);
  });

  it("REQ-185: puntaje = (v·R + m·C) / (v + m)", () => {
    expect(bayesScore(5, 0, { m: 50, C: 4.8 })).toBeCloseTo(4.8);
    expect(bayesScore(5, 50, { m: 50, C: 4.8 })).toBeCloseTo(4.9);
    expect(bayesScore(4.9, 10000, { m: 50, C: 4.8 })).toBeCloseTo(4.8995, 3);
  });

  it("REQ-185: 5.0 con 3 reseñas no le gana a 4.9 con 5,000", () => {
    const p = { m: 50, C: 4.8 };
    expect(bayesScore(4.9, 5000, p)).toBeGreaterThan(bayesScore(5, 3, p));
  });

  it("REQ-185: C es el promedio del catálogo ponderado por reseñas; sin datos válidos usa el respaldo", () => {
    expect(catalogPrior(9600, 2000)).toBeCloseTo(4.8);
    expect(catalogPrior(0, 0)).toBe(REVIEW_PRIOR_C_FALLBACK);
    expect(catalogPrior(70000, 2000)).toBe(REVIEW_PRIOR_C_FALLBACK); // 35 ★: dato malo
    expect(catalogPrior(Number.NaN, 10)).toBe(REVIEW_PRIOR_C_FALLBACK);
  });

  it("REQ-185 (REQ-100): solo reseñas reales — al menos 1 reseña y calificación entre 1 y 5", () => {
    expect(hasRealReviews({ rating: 4.8, reviews: 12 })).toBe(true);
    expect(hasRealReviews({ rating: 4.8, reviews: 0 })).toBe(false);
    expect(hasRealReviews({ rating: null, reviews: 30 })).toBe(false);
    expect(hasRealReviews({ rating: 0, reviews: 30 })).toBe(false);
    expect(hasRealReviews({ rating: 7, reviews: 30 })).toBe(false);
    expect(hasRealReviews({ rating: 4.5, reviews: 2.5 })).toBe(false);
  });

  it("REQ-185: ordena por puntaje, descarta lo que no tiene reseñas reales y desempata de forma estable", () => {
    const items = [
      { key: "b", rating: 4.9, reviews: 100 },
      { key: "a", rating: 4.9, reviews: 100 },
      { key: "sin", rating: null, reviews: 0 },
      { key: "top", rating: 4.95, reviews: 3000 },
      { key: "pocas", rating: 5, reviews: 2 },
    ];
    expect(rankByReviews(items, { m: 50, C: 4.7 }).map((x) => x.key)).toEqual(["top", "a", "b", "pocas"]);
  });
});

describe("REQ-185: diversidad en las primeras posiciones", () => {
  type T = { key: string; city: string; format: string };
  const t = (key: string, city: string, format: string): T => ({ key, city, format });
  const caps = [
    { of: (x: T) => x.city, max: 2 },
    { of: (x: T) => x.format, max: 3 },
  ];

  it("REQ-185: no más de 2 de la misma ciudad ni 3 del mismo formato", () => {
    const list = [t("1", "Roma", "pieza-libre"), t("2", "Roma", "pieza-libre"), t("3", "Roma", "tour"), t("4", "Praga", "pieza-libre"), t("5", "Lima", "pieza-libre"), t("6", "Lima", "tour"), t("7", "Oslo", "caminata")];
    expect(diversify(list, 6, caps).map((x) => x.key)).toEqual(["1", "2", "4", "6", "7", "5"]);
  });

  it("REQ-185: si no alcanza la variedad, se relaja primero el formato y luego la ciudad (no deja huecos)", () => {
    const list = [t("1", "Roma", "pieza-libre"), t("2", "Praga", "pieza-libre"), t("3", "Lima", "pieza-libre"), t("4", "Oslo", "pieza-libre"), t("5", "Roma", "pieza-libre"), t("6", "Roma", "pieza-libre")];
    expect(diversify(list, 6, caps).map((x) => x.key)).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(diversify(list, 3, caps).map((x) => x.key)).toEqual(["1", "2", "3"]);
  });

  it("REQ-185: nunca repite un elemento y respeta el tope", () => {
    const list = [t("1", "Roma", "a"), t("2", "Roma", "a")];
    expect(diversify(list, 9, caps)).toHaveLength(2);
    expect(diversify([], 9, caps)).toEqual([]);
  });
});
