import { describe, expect, it } from "vitest";
import { abandonCart, addSuggestion, openCart, removeItem, CartError } from "./cart";
import { createCartItem } from "./item";

const freeTour = createCartItem({
  id: "ft1", type: "free_tour", providerId: "freetour", externalId: "ev-99", mode: "api", cityCode: "pe-lima",
  date: "2026-12-01T10:00", people: { adults: 2, children: 0 }, price: { amount: 0, currency: "EUR" },
  chargedBy: "Travel Puzzle", cancellationPolicy: { freeUntilHours: 0, text: "Cancela cuando quieras." },
}, "confirmed");

const esim = createCartItem({
  id: "e1", type: "esim", providerId: "airalo", externalId: "pe-5gb", mode: "deeplink", cityCode: "pe-lima",
  date: "2026-12-01", people: { adults: 2, children: 0 }, price: { amount: 9, currency: "USD" },
  chargedBy: "Airalo", cancellationPolicy: { freeUntilHours: null, text: "Sin reembolso una vez activada." },
});

describe("Carrito Arma tu viaje", () => {
  it("REQ-106: el free tour confirmado entra como pieza confirmada con costo 0", () => {
    const cart = openCart("c1", freeTour);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({ type: "free_tour", status: "confirmed", price: { amount: 0 }, pinned: true });
  });

  it("REQ-106: el free tour se queda aunque se abandone el carrito", () => {
    const cart = addSuggestion(openCart("c1", freeTour), esim, { source: "user", kind: "tap" });
    const after = abandonCart(cart);
    expect(after.items.map((i) => i.id)).toEqual(["ft1"]);
    expect(after.items[0].status).toBe("confirmed");
  });

  it("REQ-106: el free tour confirmado no se quita del carrito", () => {
    expect(() => removeItem(openCart("c1", freeTour), "ft1")).toThrow(CartError);
  });

  it("REQ-106: nada viene preseleccionado: el carrito abre solo con la pieza confirmada", () => {
    expect(openCart("c1").items).toEqual([]);
  });

  it("REQ-106: una sugerencia solo entra con acción del usuario", () => {
    const cart = openCart("c1", freeTour);
    expect(() => addSuggestion(cart, esim, { source: "system" } as never)).toThrow(CartError);
    expect(() => addSuggestion(cart, esim, undefined as never)).toThrow(CartError);
    const next = addSuggestion(cart, esim, { source: "user", kind: "tap" });
    expect(next.items.map((i) => i.id)).toEqual(["ft1", "e1"]);
    expect(cart.items).toHaveLength(1); // inmutable
  });

  it("REQ-106: no duplica la misma pieza", () => {
    const once = addSuggestion(openCart("c1"), esim, { source: "user", kind: "tap" });
    expect(addSuggestion(once, esim, { source: "user", kind: "tap" }).items).toHaveLength(1);
  });

  it("REQ-106: quitar una sugerencia no toca la pieza confirmada", () => {
    const cart = addSuggestion(openCart("c1", freeTour), esim, { source: "user", kind: "tap" });
    expect(removeItem(cart, "e1").items.map((i) => i.id)).toEqual(["ft1"]);
  });
});
