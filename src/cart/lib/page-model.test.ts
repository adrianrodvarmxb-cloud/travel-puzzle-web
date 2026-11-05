import { describe, expect, it } from "vitest";
import { buildArmaTuViajeModel, parseTripQuery } from "./page-model";

const NOW = Date.parse("2026-12-01T12:00:00Z");
const piece = { title: "Free tour por el centro de Lima", date: "2026-12-10T10:00", cityName: "Lima", people: { adults: 2, children: 0 } };
const query = parseTripQuery({ pais: "PE", cc: "pe-lima" });

describe("Modelo de la página Arma tu viaje", () => {
  it("REQ-106: la Primera Pieza se muestra confirmada con costo 0", () => {
    const m = buildArmaTuViajeModel({ piece, query, advisor: { whatsapp: "525536490320" }, probes: {}, flags: {}, now: NOW });
    expect(m.piece).toMatchObject({ title: piece.title, when: "10 dic 2026", status: "Confirmada", cost: "Costo 0" });
  });

  it("REQ-105: sin adaptadores todas las tarjetas van al asesor por WhatsApp con la ciudad y las personas", () => {
    const m = buildArmaTuViajeModel({ piece, query, advisor: { whatsapp: "525536490320" }, probes: {}, flags: {}, now: NOW });
    expect(m.cards.length).toBe(4);
    expect(m.cards.every((c) => c.action?.kind === "whatsapp")).toBe(true);
    expect(decodeURIComponent((m.cards[0].action as { url: string }).url)).toContain("Lima");
  });

  it("REQ-105: sin asesor ni adaptadores no se pinta ninguna tarjeta", () => {
    const m = buildArmaTuViajeModel({ piece, query, advisor: { whatsapp: null }, probes: {}, flags: {}, now: NOW });
    expect(m.cards).toEqual([]);
  });

  it("REQ-105: una categoría con api e inventario ofrece reserva directa", () => {
    const m = buildArmaTuViajeModel({
      piece, query, advisor: { whatsapp: null }, flags: {}, now: NOW,
      probes: { tour: [{ adapterId: "freetour", mode: "api", chargedBy: "Travel Puzzle", result: "inventory" }] },
    });
    expect(m.cards.map((c) => [c.type, c.action?.kind, c.chargedByLabel])).toEqual([["tour", "book", "Lo reservas con Travel Puzzle"]]);
  });

  it("REQ-108: aplica las reglas del destino (Perú: excursiones primero) y nada preseleccionado", () => {
    const m = buildArmaTuViajeModel({ piece, query, advisor: { whatsapp: "525536490320" }, probes: {}, flags: {}, now: NOW });
    expect(m.cards[0].type).toBe("day_trip");
    expect(m.cards.every((c) => !c.selected)).toBe(true);
    expect(m.cityCode).toBe("pe-lima");
  });

  it("REQ-106: sin Primera Pieza no hay carrusel", () => {
    const m = buildArmaTuViajeModel({ piece: null, query, advisor: { whatsapp: "525536490320" }, probes: {}, flags: {}, now: NOW });
    expect(m).toEqual({ piece: null, cards: [], cityCode: null });
  });

  it("REQ-108: parámetros malos se descartan (país ISO-2, código de ciudad seguro)", () => {
    expect(parseTripQuery({ pais: "Perú", cc: "<script>" })).toEqual({ country: null, cityCode: null, travelerCountry: null });
    expect(parseTripQuery({ pais: "pe", cc: "pe-lima", viajero: "mx" })).toEqual({ country: "PE", cityCode: "pe-lima", travelerCountry: "MX" });
  });
});
