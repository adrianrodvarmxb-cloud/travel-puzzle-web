import { describe, expect, it } from "vitest";
import { cardFormatsFor, catalogTourFormat, tripFormat } from "./card-format";
import { categoryLabel } from "./experience-card";

describe("REQ-522: categoría de la tarjeta = formato de la taxonomía", () => {
  it("REQ-522: FREETOUR precio 0 → Pieza libre; precio fijo por categoría y duración", () => {
    expect(catalogTourFormat({ categoryId: 12, price: 0, durationMinutes: 150, titles: ["Free tour por el centro"] })).toBe("pieza-libre");
    expect(catalogTourFormat({ categoryId: 12, price: 25, durationMinutes: 150, titles: ["Tour a pie por el centro"] })).toBe("caminata");
    expect(catalogTourFormat({ categoryId: 4, price: 80, durationMinutes: 600, titles: ["Excursión a Toledo"] })).toBe("excursion-dia");
    expect(catalogTourFormat({ categoryId: 34, price: 40, durationMinutes: 180, titles: ["Taller de paella"] })).toBe("experiencia-unica");
    expect(catalogTourFormat({ categoryId: 30, price: 0, durationMinutes: 60, titles: ["Hop on hop off"] })).toBe("transporte");
    expect(catalogTourFormat({ categoryId: 19, price: "35.00", durationMinutes: 120, titles: ["City tour en bus"] })).toBe("tour");
  });

  it("REQ-522: categoría desconocida → por-revisar → respaldo «Experiencia»", () => {
    const f = catalogTourFormat({ categoryId: 999, price: 10, durationMinutes: 60, titles: ["x"] });
    expect(f).toBe("por-revisar");
    expect(categoryLabel(f, "es")).toBe("Experiencia");
  });

  it("REQ-522: viajes — transporte (Big Bus), circuito (Exotic Escapes), y «Versalles esencial» en excursiones no dice «Tour»", () => {
    expect(tripFormat({ kind: "transporte", priceFrom: 40, durationDays: 1, titles: ["Big Bus París"] })).toBe("transporte");
    expect(tripFormat({ kind: "circuito", priceFrom: 1500, durationDays: 8, titles: ["Triángulo de Oro"] })).toBe("circuito");
    expect(tripFormat({ kind: "unica", priceFrom: 90, durationDays: 1, titles: ["Cena en la Torre"] })).toBe("experiencia-unica");
    expect(tripFormat({ kind: "tour", priceFrom: 99, durationDays: 1, titles: ["Versalles esencial"], dayTrip: true })).toBe("excursion-dia");
    expect(tripFormat({ kind: "tour", priceFrom: 99, durationDays: 1, titles: ["Versalles esencial"], dayTrip: false })).toBe("visita-guiada"); // REQ-1252: sin señal (duda)
  });

  it("REQ-522: cardFormatsFor arma el mapa id → formato para /tours", () => {
    expect(cardFormatsFor([
      { id: "a", categoryId: 12, price: 0, durationMinutes: 120, titles: ["Free tour"] },
      { id: "b", categoryId: 4, price: 50, durationMinutes: 480, titles: ["Day trip from Lisbon"], providerId: "otro" },
    ])).toEqual({ a: "pieza-libre", b: "excursion-dia" });
  });
});

describe("REQ-10515: catalogTourFormat con el proveedor de la fila", () => {
  it("REQ-10515: una categoría de Tangol con el mapeo de Tangol da su formato; con freetour (o un proveedor sin mapeo) sería por-revisar", () => {
    const t = { categoryId: 9000002, price: 120, durationMinutes: 600, titles: ["Excursión a Bariloche y Cerro Catedral"] };
    expect(catalogTourFormat(t, "tangol")).toBe("excursion-dia");
    expect(catalogTourFormat(t)).toBe("por-revisar");
    expect(catalogTourFormat(t, "sin-mapeo")).toBe("por-revisar"); // cae al mapeo de freetour (como cardFormatsFor)
    expect(catalogTourFormat(t, null)).toBe("por-revisar");
  });
});
