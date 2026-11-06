/**
 * REQ-104: contrato de un proveedor del carrito. Un proveedor nuevo = un adaptador nuevo,
 * sin tocar el carrito (OCP). Solo 5 operaciones (ISP). Puro: sin I/O aquí.
 *  - api: la pieza vive en el carrito y se reserva por API.
 *  - deeplink: enlace de afiliado con subID por pieza; se reserva y paga en el sitio del proveedor.
 */
import type { AdapterMode, CartItem, CartItemType, Money, People } from "./item";

export interface SearchQuery {
  type: CartItemType;
  cityCode: string;
  /** ISO-3166 alfa-2 del destino. */
  country: string;
  date: string;
  people: People;
  /** Nombre de la ciudad para prellenar búsquedas de proveedores (REQ-120). */
  cityName?: string;
  /** Aeropuerto (IATA o nombre) si se conoce. */
  airport?: string;
  /** Para el subID por pieza de los deeplinks. */
  cartId?: string;
  itemId?: string;
}

export interface Offer {
  externalId: string;
  title: string;
  price?: Money;
  url?: string;
}

export interface Availability { available: boolean; price?: Money; places?: number }

export type ReserveResult =
  | { kind: "reserved"; externalRef: string; price?: Money }
  | { kind: "redirect"; url: string };

export type ChargeResult =
  | { kind: "payment_url"; url: string; expiresAt: string }
  | { kind: "redirect"; url: string }
  /** Nada que cobrar (costo 0). */
  | { kind: "none" }
  /** Cobros apagados (candado Stripe/pagos). */
  | { kind: "disabled" };

export interface ChargeUrls { success: string; cancel: string }

export interface ProviderAdapter {
  id: string;
  mode: AdapterMode;
  types: CartItemType[];
  /** Nombre que ve el cliente en «Lo reservas con …». */
  chargedBy: string;
  search(q: SearchQuery): Promise<Offer[]>;
  availability(externalId: string, q: SearchQuery): Promise<Availability>;
  reserve(item: CartItem): Promise<ReserveResult>;
  cancel(item: CartItem): Promise<{ ok: boolean }>;
  charge(item: CartItem, urls: ChargeUrls): Promise<ChargeResult>;
}

const clean = (s: string) => s.replace(/[^A-Za-z0-9_]/g, "");

/** REQ-104: subID por pieza con el formato marker-cartId-itemId. */
export function affiliateSubId(marker: string, cartId: string, itemId: string): string {
  return [marker, cartId, itemId].map(clean).join("-");
}

/** REQ-104: agrega el subID al enlace del proveedor conservando sus parámetros. */
export function withSubId(url: string, param: string, subId: string): string {
  const u = new URL(url);
  u.searchParams.set(param, subId);
  return u.toString();
}
