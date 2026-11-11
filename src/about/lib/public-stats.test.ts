import { describe, expect, it } from "vitest";
import { publicStats, hasLiveStats } from "./public-stats";

describe("cifras públicas de la agencia", () => {
  it("REQ-1360: las cifras públicas no llevan calificación ni reseñas de la agencia", () => {
    const out = publicStats({ tours: 8106, cities: 1030, countries: 138, rating: 4.795, reviews: 503490 });
    expect(out).toEqual({ tours: 8106, cities: 1030, countries: 138 });
    expect(JSON.stringify(out)).not.toMatch(/rating|reviews/);
  });

  it("REQ-1360: una calificación sola no hace visible la sección de cifras", () => {
    expect(hasLiveStats({ tours: 0, cities: 0, countries: 0, rating: 4.8 })).toBe(false);
    expect(hasLiveStats(null)).toBe(false);
    expect(hasLiveStats({ tours: 10, cities: 0, countries: 0, rating: null })).toBe(true);
  });
});
