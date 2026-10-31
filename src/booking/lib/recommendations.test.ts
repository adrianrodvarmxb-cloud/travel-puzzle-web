import { describe, it, expect } from "vitest";
import { mixRecommendations } from "./recommendations";

const paid = ["P1", "P2", "P3", "P4"];
const free = ["F1", "F2", "F3"];

describe("recomendaciones 60 % pago / 40 % free", () => {
  it("3 lugares: 2 de pago y 1 gratis, los de pago primero", () => {
    expect(mixRecommendations(paid, free, 3)).toEqual(["P1", "P2", "F1"]);
  });
  it("5 lugares: 3 de pago y 2 gratis", () => {
    expect(mixRecommendations(paid, free, 5)).toEqual(["P1", "P2", "P3", "F1", "F2"]);
  });
  it("si faltan de pago, completa con gratis; si faltan gratis, con pago", () => {
    expect(mixRecommendations(["P1"], free, 3)).toEqual(["P1", "F1", "F2"]);
    expect(mixRecommendations(paid, [], 3)).toEqual(["P1", "P2", "P3"]);
  });
  it("mientras no se puedan comprar tours de pago, solo free tours", () => {
    expect(mixRecommendations(paid, free, 3, false)).toEqual(["F1", "F2", "F3"]);
  });
});
