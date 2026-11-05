import { describe, expect, it } from "vitest";
import { CART_ITEM_TYPES, CartItemError, createCartItem, isCurrencyCode } from "./item";

const base = {
  id: "i1",
  type: "tour" as const,
  providerId: "civitatis",
  externalId: "123",
  mode: "deeplink" as const,
  cityCode: "pe-cusco",
  date: "2026-12-01",
  people: { adults: 2, children: 0 },
  price: { amount: 45.5, currency: "USD" },
  chargedBy: "Civitatis",
  cancellationPolicy: { freeUntilHours: 24, text: "Cancelación gratis hasta 24 h antes." },
};

describe("CartItem", () => {
  it("REQ-104: acepta los 11 tipos del pedido y ninguno más", () => {
    expect([...CART_ITEM_TYPES].sort()).toEqual(
      ["free_tour", "tour", "day_trip", "transfer", "esim", "tickets", "insurance", "transport", "lodging", "car_rental", "visa"].sort(),
    );
    for (const type of CART_ITEM_TYPES) expect(createCartItem({ ...base, type }).type).toBe(type);
    expect(() => createCartItem({ ...base, type: "crucero" as never })).toThrow(CartItemError);
  });

  it("REQ-104: guarda provider_id, external_id, fecha, personas, precio, moneda, estado y política", () => {
    const item = createCartItem(base);
    expect(item).toMatchObject({
      providerId: "civitatis",
      externalId: "123",
      date: "2026-12-01",
      people: { adults: 2, children: 0 },
      price: { amount: 45.5, currency: "USD" },
      status: "in_cart",
      cancellationPolicy: { freeUntilHours: 24 },
    });
  });

  it("REQ-104: la moneda es ISO 4217 (tres letras mayúsculas reconocidas)", () => {
    expect(isCurrencyCode("EUR")).toBe(true);
    expect(isCurrencyCode("MXN")).toBe(true);
    expect(isCurrencyCode("eur")).toBe(false);
    expect(isCurrencyCode("PESOS")).toBe(false);
    expect(isCurrencyCode("XYZ")).toBe(false);
    expect(() => createCartItem({ ...base, price: { amount: 1, currency: "pesos" } })).toThrow(CartItemError);
  });

  it("REQ-104: rechaza precio negativo, fecha inválida o sin adultos", () => {
    expect(() => createCartItem({ ...base, price: { amount: -1, currency: "USD" } })).toThrow(CartItemError);
    expect(() => createCartItem({ ...base, date: "mañana" })).toThrow(CartItemError);
    expect(() => createCartItem({ ...base, people: { adults: 0, children: 2 } })).toThrow(CartItemError);
  });
});
