// REQ-022 — precio de venta = neto + margen, nunca abajo del mínimo de venta de BeMyGuest (gate B).
import { describe, expect, it } from "vitest";
import fixture from "../fixtures/price-list-date.json";
import { priceForSlot, ratesFor, sellPrice } from "./price";

const day = fixture.data;

describe("precios BeMyGuest", () => {
  it("REQ-022: lee neto, público y mínimo por categoría", () => {
    expect(ratesFor(day.prices[0], "adult")).toEqual({ nett: 31.59, retail: 36, minimum: 35, currency: "SGD" });
    expect(ratesFor(day.prices[0], "child")).toEqual({ nett: 25.59, retail: 30, minimum: null, currency: "SGD" });
    expect(ratesFor(day.prices[0], "senior")).toBeNull();
  });

  it("REQ-022: neto + margen redondeado hacia arriba a unidades", () => {
    expect(sellPrice({ nett: 31.59, minimum: null }, 0.2)).toBe(38); // 37.908 → 38
    expect(sellPrice({ nett: 100, minimum: null }, 0)).toBe(100);
  });

  it("REQ-022: nunca abajo del precio mínimo de venta (paridad)", () => {
    expect(sellPrice({ nett: 31.59, minimum: 35 }, 0.05)).toBe(35); // 33.17 → sube a 35
  });

  it("REQ-022: margen inválido no vende abajo del neto", () => {
    expect(sellPrice({ nett: 50, minimum: null }, -0.5)).toBe(50);
    expect(sellPrice({ nett: 50, minimum: null }, Number.NaN)).toBe(50);
  });

  it("REQ-022: con horarios usa el precio ligado a ese horario; sin horarios, el primero", () => {
    const withSlots = {
      prices: [
        { id: "p1", rates: [{ type: "nettPrice", category: "adult", currency: "SGD", amount: 10 }] },
        { id: "p2", rates: [{ type: "nettPrice", category: "adult", currency: "SGD", amount: 20 }] },
      ],
      timeslots: [{ uuid: "t1", priceId: "p1" }, { uuid: "t2", priceId: "p2" }],
    };
    expect(priceForSlot(withSlots, "t2")?.id).toBe("p2");
    expect(priceForSlot(withSlots, "nope")).toBeNull();
    expect(priceForSlot(day, null)?.id).toBe(day.prices[0].id);
  });
});
