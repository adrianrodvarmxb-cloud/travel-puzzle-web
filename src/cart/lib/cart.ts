/**
 * REQ-106: carrito «Arma tu viaje». El free tour ya se reservó por API antes de abrirlo:
 * entra como pieza confirmada (costo 0) y se queda aunque se abandone el carrito.
 * Las sugerencias entran solo con un toque del usuario; nada viene preseleccionado. Puro e inmutable.
 */
import type { CartItem } from "./item";

export interface Cart { id: string; items: CartItem[] }

/** Única forma de agregar: un toque del usuario (no hay agregado automático). */
export interface UserAction { source: "user"; kind: "tap" }

export class CartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartError";
  }
}

/** REQ-106: abre el carrito solo con la Primera Pieza confirmada (si la hay). */
export function openCart(id: string, confirmedFreeTour?: CartItem): Cart {
  if (!confirmedFreeTour) return { id, items: [] };
  if (confirmedFreeTour.status !== "confirmed") throw new CartError("La Primera Pieza entra solo ya confirmada.");
  return { id, items: [{ ...confirmedFreeTour, cartId: id, pinned: true, price: { ...confirmedFreeTour.price, amount: 0 } }] };
}

/** REQ-106: agrega una sugerencia solo si viene de una acción del usuario. */
export function addSuggestion(cart: Cart, item: CartItem, action: UserAction): Cart {
  if (action?.source !== "user" || action.kind !== "tap") throw new CartError("Las sugerencias solo entran con un toque del cliente.");
  if (cart.items.some((i) => i.id === item.id)) return cart;
  return { ...cart, items: [...cart.items, { ...item, cartId: cart.id, status: "in_cart" }] };
}

/** REQ-106: quita una sugerencia; la pieza confirmada no se quita (se cancela con su proveedor). */
export function removeItem(cart: Cart, itemId: string): Cart {
  const item = cart.items.find((i) => i.id === itemId);
  if (item?.pinned || item?.status === "confirmed") throw new CartError("Una pieza confirmada se cancela con su proveedor, no se quita.");
  return { ...cart, items: cart.items.filter((i) => i.id !== itemId) };
}

/** REQ-106: al abandonar, solo sobrevive lo confirmado (el free tour sigue reservado). */
export function abandonCart(cart: Cart): Cart {
  return { ...cart, items: cart.items.filter((i) => i.status === "confirmed") };
}
