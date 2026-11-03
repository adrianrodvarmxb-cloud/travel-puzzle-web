import { describe, it, expect } from "vitest";
import { parseSort, sortToPagination, SORT_OPTIONS } from "./sort";

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
  it("las opciones del selector", () => {
    expect(SORT_OPTIONS).toEqual(["reviews", "rating", "price"]);
  });
});
