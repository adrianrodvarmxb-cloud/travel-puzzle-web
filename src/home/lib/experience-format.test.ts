import { describe, it, expect } from "vitest";
import { freetourFormat, tripFormat, isDayTripTour, isDayTripTrip, isOnSiteForRanking } from "./experience-format";

const ft = (categoryId: number, price = 10, durationMinutes: number | null = 120, titles: string[] = ["Tour"]) => ({ categoryId, price, durationMinutes, titles });

describe("REQ-186: regla mínima de formato (temporal hasta el clasificador de taxonomía)", () => {
  it("REQ-186: categorías 8 y 31 quedan «fuera»; ids desconocidos, «por-revisar»", () => {
    expect(freetourFormat(ft(8, 0))).toBe("fuera");
    expect(freetourFormat(ft(31))).toBe("fuera");
    expect(freetourFormat(ft(6))).toBe("por-revisar");
    expect(freetourFormat(ft(999))).toBe("por-revisar");
  });

  it("REQ-186: traslados (29, o 13/14 con «transfer» sin «tour») y transporte (30 o hop-on)", () => {
    expect(freetourFormat(ft(29))).toBe("traslado");
    expect(freetourFormat(ft(13, 30, 60, ["Airport transfer to Lisbon"]))).toBe("traslado");
    expect(freetourFormat(ft(13, 30, 60, ["Transfer and city tour"]))).not.toBe("traslado");
    expect(freetourFormat(ft(30))).toBe("transporte");
    expect(freetourFormat(ft(19, 25, 1440, ["Hop-On Hop-Off Bus"]))).toBe("transporte");
  });

  it("REQ-186: precio 0 es pieza libre, salvo entradas, audioguías y lo que va antes", () => {
    expect(freetourFormat(ft(12, 0))).toBe("pieza-libre");
    expect(freetourFormat(ft(4, 0, 600))).toBe("pieza-libre");
    expect(freetourFormat(ft(17, 0))).toBe("autoguiado");
    expect(freetourFormat(ft(24, 0))).toBe("entradas");
    expect(freetourFormat(ft(12, 15))).toBe("caminata");
  });

  it("REQ-186: excursión de un día = cat 4, o ≥ 360 min con excursión/day trip/full day/desde/from en el título", () => {
    expect(freetourFormat(ft(4, 40, 600))).toBe("excursion-dia");
    expect(freetourFormat(ft(19, 40, 480, ["Excursión a Toledo desde Madrid"]))).toBe("excursion-dia");
    expect(freetourFormat(ft(25, 40, 420, ["Full day trip to the Blue Lagoon"]))).toBe("excursion-dia");
    expect(freetourFormat(ft(19, 40, 300, ["Excursión a Toledo desde Madrid"]))).toBe("tour");
    expect(freetourFormat(ft(19, 40, 480, ["Gran tour en coche"]))).toBe("tour");
  });

  it("REQ-186: varios días gana a excursión (≥ 1440 min o «N días»)", () => {
    expect(freetourFormat(ft(4, 90, 2880))).toBe("circuito");
    expect(freetourFormat(ft(4, 90, 600, ["Sahara 3 días desde Marrakech"]))).toBe("circuito");
    expect(freetourFormat(ft(4, 90, 600, ["Day trip from Marrakech"]))).toBe("excursion-dia");
  });

  it("REQ-186: experiencias únicas y tour genérico", () => {
    expect(freetourFormat(ft(7))).toBe("experiencia-unica");
    expect(freetourFormat(ft(5, 30, 180, ["Cooking class in Rome"]))).toBe("experiencia-unica");
    expect(freetourFormat(ft(5, 30, 180, ["Tapas tour"]))).toBe("tour");
  });

  it("REQ-186: una excursión gratis (cat 4, precio 0) sí es «excursión de un día» para el carrusel", () => {
    expect(isDayTripTour(ft(4, 0, 600))).toBe(true);
    expect(isDayTripTour(ft(4, 40, 600))).toBe(true);
    expect(isDayTripTour(ft(12, 0, 120))).toBe(false);
    expect(isDayTripTour(ft(4, 0, 2880))).toBe(false);
    expect(isDayTripTour(ft(8, 0, 600, ["Day trip online"]))).toBe(false);
  });

  it("REQ-186: viajes propios — tour de 1 día con esas palabras es excursión; transporte y circuito no", () => {
    expect(tripFormat({ kind: "tour", durationDays: 1, titles: ["Paracas e Islas Ballestas desde Lima"] })).toBe("excursion-dia");
    expect(tripFormat({ kind: "tour", durationDays: null, titles: ["Full Day Valle Sagrado"] })).toBe("excursion-dia");
    expect(tripFormat({ kind: "tour", durationDays: 1, titles: ["City tour Lima colonial"] })).toBe("tour");
    expect(tripFormat({ kind: "tour", durationDays: 2, titles: ["Machu Picchu desde Cusco"] })).toBe("tour");
    expect(tripFormat({ kind: "transporte", durationDays: 1, titles: ["Bus turístico desde el centro"] })).toBe("transporte");
    expect(tripFormat({ kind: "circuito", durationDays: 8, titles: ["China"] })).toBe("circuito");
    expect(tripFormat({ kind: "personalizado", durationDays: null, titles: [] })).toBe("a-la-medida");
    expect(tripFormat({ kind: "unica", durationDays: 1, titles: [] })).toBe("experiencia-unica");
    expect(isDayTripTrip({ kind: "tour", durationDays: 1, titles: ["Excursión a Paracas"] })).toBe(true);
  });

  it("REQ-185/186: «Los más elegidos» excluye fuera, traslado, transporte, alquiler y por-revisar", () => {
    for (const f of ["fuera", "traslado", "transporte", "alquiler", "por-revisar"] as const) expect(isOnSiteForRanking(f)).toBe(false);
    for (const f of ["pieza-libre", "caminata", "tour", "excursion-dia", "experiencia-unica", "entradas", "autoguiado", "circuito"] as const) expect(isOnSiteForRanking(f)).toBe(true);
  });
});
