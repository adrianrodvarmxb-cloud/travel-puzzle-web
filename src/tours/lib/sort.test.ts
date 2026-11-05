import { describe, it, expect } from "vitest";
import { parseSort, sortToPagination, SORT_OPTIONS, sortOptions } from "./sort";

describe("ordenar tours", () => {
  it("por defecto, los que tienen más reseñas", () => {
    expect(parseSort(null)).toBe("reviews");
    expect(parseSort("cualquier-cosa")).toBe("reviews");
    expect(sortToPagination("reviews")).toEqual({ sortBy: "reviewsNumber", sortOrder: "desc" });
  });
  it("mejor calificados y precio", () => {
    expect(sortToPagination(parseSort("rating"))).toEqual({ sortBy: "rating", sortOrder: "desc" });
    expect(sortToPagination(parseSort("price"))).toEqual({ sortBy: "price", sortOrder: "asc" });
  });
  it("más cortos primero", () => {
    expect(sortToPagination(parseSort("duration"))).toEqual({ sortBy: "duration", sortOrder: "asc" });
  });
  it("las opciones del selector", () => {
    expect(SORT_OPTIONS).toEqual(["reviews", "rating", "price", "duration"]);
  });
});

describe("REQ-048 orden por relevancia al buscar", () => {
  it("REQ-048: con búsqueda y sin orden elegido, el orden es relevancia (como Civitatis/GYG)", () => {
    expect(parseSort(null, true)).toBe("relevance");
    expect(parseSort("price", true)).toBe("price");
    expect(parseSort("relevance", false)).toBe("reviews"); // sin búsqueda no aplica
    expect(sortToPagination("relevance")).toEqual({ sortBy: "relevance", sortOrder: "desc" });
  });
  it("REQ-048: el selector ofrece relevancia solo cuando hay búsqueda", () => {
    expect(sortOptions(true)).toEqual(["relevance", "reviews", "rating", "price", "duration"]);
    expect(sortOptions(false)).toEqual(["reviews", "rating", "price", "duration"]);
  });
});
