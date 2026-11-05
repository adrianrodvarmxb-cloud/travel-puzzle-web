/**
 * REQ-104: pieza genérica del carrito «Arma tu viaje». Sirve para cualquier proveedor
 * (api o deeplink); el carrito no sabe de proveedores concretos. Puro.
 */
import { z } from "zod";

export const CART_ITEM_TYPES = [
  "free_tour", "tour", "day_trip", "transfer", "esim", "tickets", "insurance", "transport", "lodging", "car_rental", "visa",
] as const;
export type CartItemType = (typeof CART_ITEM_TYPES)[number];

export const CART_ITEM_STATUSES = ["in_cart", "pending_payment", "confirmed", "cancelled", "failed"] as const;
export type CartItemStatus = (typeof CART_ITEM_STATUSES)[number];

/**
 * api: reserva nativa · deeplink: afiliado en el sitio del proveedor ·
 * request (REQ-121): el cliente lo pide y Travel Puzzle lo compra (sin pago directo).
 */
export type AdapterMode = "api" | "deeplink" | "request";

export interface Money { amount: number; currency: string }
export interface People { adults: number; children: number }
export interface CancellationPolicy {
  /** Horas antes del servicio con cancelación gratis; null = sin reembolso o lo define el proveedor. */
  freeUntilHours: number | null;
  text: string;
}

export interface CartItem {
  id: string;
  type: CartItemType;
  providerId: string;
  externalId: string;
  mode: AdapterMode;
  cityCode: string;
  /** Nombre de la ciudad (para prellenar la búsqueda del proveedor). */
  cityName?: string;
  /** ISO 8601: fecha (AAAA-MM-DD) o fecha y hora. */
  date: string;
  people: People;
  price: Money;
  status: CartItemStatus;
  cancellationPolicy: CancellationPolicy;
  /** Quién cobra, como lo ve el cliente («Lo reservas con …»). */
  chargedBy: string;
  /** Pieza que no se quita del carrito (la Primera Pieza confirmada). */
  pinned?: boolean;
  /** Referencia de la reserva en el proveedor (refNumber, etc.). */
  externalRef?: string;
  /** Pago pendiente con el proveedor (p. ej. paymentUrl de Stripe que expira). */
  payment?: { url: string; expiresAt: string };
  /** Carrito al que pertenece (para el subID de afiliado). */
  cartId?: string;
}

export class CartItemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartItemError";
  }
}

let currencies: Set<string> | null = null;
/** REQ-104: código ISO 4217 reconocido por el runtime (tres letras mayúsculas). */
export function isCurrencyCode(code: string): boolean {
  if (!/^[A-Z]{3}$/.test(code)) return false;
  currencies ??= new Set(typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("currency") : []);
  return currencies.size === 0 || currencies.has(code);
}

const zItemInput = z.object({
  id: z.string().min(1),
  type: z.enum(CART_ITEM_TYPES),
  providerId: z.string().min(1),
  externalId: z.string().min(1),
  mode: z.enum(["api", "deeplink", "request"]),
  cityCode: z.string().min(1),
  cityName: z.string().min(1).optional(),
  date: z.string().refine((d) => /^\d{4}-\d{2}-\d{2}/.test(d) && !Number.isNaN(Date.parse(d)), "fecha inválida"),
  people: z.object({ adults: z.number().int().min(1), children: z.number().int().min(0) }),
  price: z.object({ amount: z.number().finite().min(0), currency: z.string().refine(isCurrencyCode, "moneda no ISO 4217") }),
  cancellationPolicy: z.object({ freeUntilHours: z.number().min(0).nullable(), text: z.string().min(1) }),
  chargedBy: z.string().min(1),
  pinned: z.boolean().optional(),
  externalRef: z.string().optional(),
  payment: z.object({ url: z.string().url(), expiresAt: z.string() }).optional(),
  cartId: z.string().optional(),
});

export type CartItemInput = Omit<CartItem, "status">;

/** REQ-104: crea y valida una pieza; los datos malos no entran al carrito. */
export function createCartItem(input: CartItemInput, status: CartItemStatus = "in_cart"): CartItem {
  const parsed = zItemInput.safeParse(input);
  if (!parsed.success) throw new CartItemError(`Pieza inválida: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  return { ...parsed.data, status };
}
