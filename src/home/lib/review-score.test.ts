import { describe, it, expect } from "vitest";
import { bayesScore, catalogPrior, hasRealReviews, rankByReviews, rankWithPrior, priorScore, ensureEachGroup, diversify, REVIEW_PRIOR_M, REVIEW_PRIOR_C_FALLBACK } from "./review-score";

describe("REQ-450: medidor de reseñas (calificación bayesiana)", () => {
  it("REQ-450: m = 50 y C de respaldo 4.5 (documentados en docs/gates-carruseles-home-2026-11.md)", () => {
    expect(REVIEW_PRIOR_M).toBe(50);
    expect(REVIEW_PRIOR_C_FALLBACK).toBe(4.5);
  });

  it("REQ-450: puntaje = (v·R + m·C) / (v + m)", () => {
    expect(bayesScore(5, 0, { m: 50, C: 4.8 })).toBeCloseTo(4.8);
    expect(bayesScore(5, 50, { m: 50, C: 4.8 })).toBeCloseTo(4.9);
    expect(bayesScore(4.9, 10000, { m: 50, C: 4.8 })).toBeCloseTo(4.8995, 3);
  });

  it("REQ-450: 5.0 con 3 reseñas no le gana a 4.9 con 5,000", () => {
    const p = { m: 50, C: 4.8 };
    expect(bayesScore(4.9, 5000, p)).toBeGreaterThan(bayesScore(5, 3, p));
  });

  it("REQ-450: C es el promedio del catálogo ponderado por reseñas; sin datos válidos usa el respaldo", () => {
    expect(catalogPrior(9600, 2000)).toBeCloseTo(4.8);
    expect(catalogPrior(0, 0)).toBe(REVIEW_PRIOR_C_FALLBACK);
    expect(catalogPrior(70000, 2000)).toBe(REVIEW_PRIOR_C_FALLBACK); // 35 ★: dato malo
    expect(catalogPrior(Number.NaN, 10)).toBe(REVIEW_PRIOR_C_FALLBACK);
  });

  it("REQ-450 (REQ-100): solo reseñas reales — al menos 1 reseña y calificación entre 1 y 5", () => {
    expect(hasRealReviews({ rating: 4.8, reviews: 12 })).toBe(true);
    expect(hasRealReviews({ rating: 4.8, reviews: 0 })).toBe(false);
    expect(hasRealReviews({ rating: null, reviews: 30 })).toBe(false);
    expect(hasRealReviews({ rating: 0, reviews: 30 })).toBe(false);
    expect(hasRealReviews({ rating: 7, reviews: 30 })).toBe(false);
    expect(hasRealReviews({ rating: 4.5, reviews: 2.5 })).toBe(false);
  });

  it("REQ-450: ordena por puntaje, descarta lo que no tiene reseñas reales y desempata de forma estable", () => {
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

describe("REQ-450: diversidad en las primeras posiciones", () => {
  type T = { key: string; city: string; format: string };
  const t = (key: string, city: string, format: string): T => ({ key, city, format });
  const caps = [
    { of: (x: T) => x.city, max: 2 },
    { of: (x: T) => x.format, max: 3 },
  ];

  it("REQ-450: no más de 2 de la misma ciudad ni 3 del mismo formato", () => {
    const list = [t("1", "Roma", "pieza-libre"), t("2", "Roma", "pieza-libre"), t("3", "Roma", "tour"), t("4", "Praga", "pieza-libre"), t("5", "Lima", "pieza-libre"), t("6", "Lima", "tour"), t("7", "Oslo", "caminata")];
    expect(diversify(list, 6, caps).map((x) => x.key)).toEqual(["1", "2", "4", "6", "7", "5"]);
  });

  it("REQ-450: si no alcanza la variedad, se relaja primero el formato y luego la ciudad (no deja huecos)", () => {
    const list = [t("1", "Roma", "pieza-libre"), t("2", "Praga", "pieza-libre"), t("3", "Lima", "pieza-libre"), t("4", "Oslo", "pieza-libre"), t("5", "Roma", "pieza-libre"), t("6", "Roma", "pieza-libre")];
    expect(diversify(list, 6, caps).map((x) => x.key)).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(diversify(list, 3, caps).map((x) => x.key)).toEqual(["1", "2", "3"]);
  });

  it("REQ-450: nunca repite un elemento y respeta el tope", () => {
    const list = [t("1", "Roma", "a"), t("2", "Roma", "a")];
    expect(diversify(list, 9, caps)).toHaveLength(2);
    expect(diversify([], 9, caps)).toEqual([]);
  });
});

describe("REQ-10515: sin reseñas entran con el puntaje del prior (PO 13-11 16:00, opción A)", () => {
  const p = { m: 50, C: 4.7 };

  it("REQ-10515: sin reseñas reales el puntaje es C (bayes con v = 0); con reseñas buenas sube y con malas baja", () => {
    expect(priorScore({ rating: null, reviews: 0 }, p)).toBe(p.C);
    expect(priorScore({ rating: 4.8, reviews: 0 }, p)).toBe(p.C); // 0 reseñas: la nota no cuenta
    expect(priorScore({ rating: 7, reviews: 30 }, p)).toBe(p.C); // dato malo: como sin reseñas
    expect(priorScore({ rating: 5, reviews: 100 }, p)).toBeGreaterThan(p.C);
    expect(priorScore({ rating: 3, reviews: 100 }, p)).toBeLessThan(p.C);
    expect(priorScore({ rating: 4.9, reviews: 500 }, p)).toBe(bayesScore(4.9, 500, p));
  });

  it("REQ-10515: rankWithPrior ordena a todos (con y sin reseñas) por puntaje; desempate: más reseñas, luego la llave", () => {
    const items = [
      { key: "sin-b", rating: null, reviews: 0 },
      { key: "malo", rating: 3.5, reviews: 400 },
      { key: "sin-a", rating: null, reviews: 0 },
      { key: "top", rating: 4.95, reviews: 3000 },
      { key: "igual", rating: 4.7, reviews: 80 }, // exactamente C, pero con reseñas: antes que los sin reseñas
    ];
    expect(rankWithPrior(items, p).map((x) => x.key)).toEqual(["top", "igual", "sin-a", "sin-b", "malo"]);
    expect(rankWithPrior([], p)).toEqual([]);
  });
});

describe("REQ-10516: todos los proveedores con candidatos aparecen en la primera página", () => {
  type T = { key: string; provider: string };
  const t = (key: string, provider: string): T => ({ key, provider });
  const of = (x: T) => x.provider;

  it("REQ-10516: si un proveedor con candidatos no entró, sustituye la última tarjeta del proveedor más repetido (al final de la página)", () => {
    const pool = [t("f1", "freetour"), t("f2", "freetour"), t("f3", "freetour"), t("p1", "propios"), t("t1", "tangol"), t("t2", "tangol")];
    const head = [t("f1", "freetour"), t("f2", "freetour"), t("f3", "freetour"), t("p1", "propios")];
    expect(ensureEachGroup(head, pool, of).map((x) => x.key)).toEqual(["f1", "f2", "p1", "t1"]);
  });

  it("REQ-10516: no cambia nada si ya están todos, si la página está vacía o si quitar uno dejaría fuera a otro proveedor", () => {
    const pool = [t("a", "x"), t("b", "y")];
    expect(ensureEachGroup([t("a", "x"), t("b", "y")], pool, of).map((x) => x.key)).toEqual(["a", "b"]);
    expect(ensureEachGroup([], pool, of)).toEqual([]);
    expect(ensureEachGroup([t("a", "x")], pool, of).map((x) => x.key)).toEqual(["a"]); // una sola tarjeta: no hay a quién quitar
  });
});
