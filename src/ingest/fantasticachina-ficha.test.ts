import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// REQ-10726: la ficha de Fantástica China dice lo que dice su tarifario 2027-2028.
type Item = { status: string; trip: { titleEs: string; cities: string[]; minPax?: number | null; importantInfo: string; cancellation: { tiers: { daysBefore: number; refundPct: number }[] } } };
const trips = (JSON.parse(readFileSync("imports/fantasticachina-2027.json", "utf8")) as { trips: Item[] }).trips;

describe("REQ-10726 fichas de Fantástica China según su tarifario", () => {
  it("REQ-10726: todos los viajes salen desde 2 pasajeros", () => {
    expect(trips.length).toBe(51);
    expect(trips.filter((t) => t.trip.minPax !== 2)).toEqual([]);
  });
  it("REQ-10726: todos avisan cómo es la habitación triple", () => {
    expect(trips.filter((t) => !t.trip.importantInfo.includes("Habitación triple: es una habitación doble con una cama plegable"))).toEqual([]);
  });
  it("REQ-10726: los que pasan por Beijing avisan del aeropuerto Daxing, y solo esos", () => {
    const conBeijing = trips.filter((t) => t.trip.cities.includes("Beijing") || t.trip.titleEs.includes("Beijing"));
    expect(conBeijing.length).toBeGreaterThan(30);
    expect(conBeijing.filter((t) => !t.trip.importantInfo.includes("Daxing"))).toEqual([]);
    expect(trips.filter((t) => !conBeijing.includes(t) && t.trip.importantInfo.includes("Daxing"))).toEqual([]);
  });
  it("REQ-10726: Gran Lujo explica su cancelación fuera de junio a octubre y conserva la tabla más estricta", () => {
    const lujo = trips.filter((t) => t.trip.titleEs.includes("Gran Lujo"));
    expect(lujo.length).toBe(9);
    for (const t of lujo) {
      expect(t.trip.importantInfo).toContain("10 % entre 25 y 45 días");
      expect(t.trip.cancellation.tiers.map((x) => [x.daysBefore, x.refundPct])).toEqual([[46, 100], [30, 90], [17, 80], [11, 70], [3, 50], [0, 0]]);
    }
    expect(trips.filter((t) => !lujo.includes(t) && t.trip.importantInfo.includes("Cancelación en Gran Lujo"))).toEqual([]);
  });
  it("REQ-10726: la información importante cabe en el campo (3000 caracteres)", () => {
    expect(Math.max(...trips.map((t) => t.trip.importantInfo.length))).toBeLessThan(3000);
  });
});
