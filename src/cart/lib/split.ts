/**
 * REQ-107: el carrito se ve como uno solo pero se paga en partes, una por proveedor,
 * con el desglose y la política de cada pieza. Un paymentUrl vencido se renueva.
 * Cancelar una pieza no toca las demás. El seguro solo va como deeplink.
 * Cobros reales: candado (paymentsEnabled=false por defecto). Puro; adaptadores inyectados.
 */
import type { Cart } from "./cart";
import type { AdapterMode, CartItem } from "./item";
import type { ChargeResult, ChargeUrls, ProviderAdapter } from "./adapter";

export interface PaymentLine {
  itemId: string;
  type: CartItem["type"];
  amount: number;
  currency: string;
  policy: string;
  /** false = no se cobra (costo 0, ya confirmada o cancelada). */
  payable: boolean;
}

export interface PaymentPart {
  providerId: string;
  chargedBy: string;
  mode: AdapterMode;
  lines: PaymentLine[];
  /** Totales por moneda (ISO 4217) de lo que sí se cobra. */
  totals: Record<string, number>;
}

export class SplitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SplitError";
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** REQ-107: agrupa por proveedor, en el orden en que aparecen en el carrito. */
export function splitByProvider(cart: Cart): PaymentPart[] {
  const parts = new Map<string, PaymentPart>();
  for (const item of cart.items) {
    if (item.type === "insurance" && item.mode !== "deeplink") throw new SplitError("El seguro solo se ofrece como enlace de afiliado.");
    const part = parts.get(item.providerId) ?? { providerId: item.providerId, chargedBy: item.chargedBy, mode: item.mode, lines: [], totals: {} };
    const payable = item.price.amount > 0 && item.status !== "cancelled" && item.status !== "confirmed";
    part.lines.push({ itemId: item.id, type: item.type, amount: item.price.amount, currency: item.price.currency, policy: item.cancellationPolicy.text, payable });
    if (payable) part.totals[item.price.currency] = round2((part.totals[item.price.currency] ?? 0) + item.price.amount);
    parts.set(item.providerId, part);
  }
  return [...parts.values()];
}

/** Margen para no mandar al cliente a un pago que vence en segundos. */
const RENEW_MARGIN_MS = 5 * 60 * 1000;

/** REQ-107: ¿hay que pedir otro paymentUrl? */
export function needsRenewal(item: CartItem, now: number): boolean {
  if (!item.payment) return true;
  const exp = Date.parse(item.payment.expiresAt);
  return Number.isNaN(exp) || exp - RENEW_MARGIN_MS <= now;
}

interface ChargeOpts { paymentsEnabled: boolean; urls: ChargeUrls }

export type PartChargeResult =
  | { kind: "disabled" }
  | { kind: "charged"; results: { itemId: string; result: ChargeResult }[] };

/**
 * REQ-107: cobra cada pieza pagable de una parte con su adaptador (cada reserva tiene su propio cobro).
 * Con pagos apagados no llama al proveedor (candado Stripe).
 */
export async function chargePart(part: PaymentPart, adapter: ProviderAdapter, opts: ChargeOpts & { items?: CartItem[] }): Promise<PartChargeResult> {
  if (!opts.paymentsEnabled) return { kind: "disabled" };
  const payable = new Set(part.lines.filter((l) => l.payable).map((l) => l.itemId));
  const items = (opts.items ?? []).filter((i) => payable.has(i.id));
  const results = [];
  for (const item of items) results.push({ itemId: item.id, result: await adapter.charge(item, opts.urls) });
  return { kind: "charged", results };
}

/** REQ-107: devuelve la pieza con un paymentUrl vigente (lo renueva si venció). */
export async function ensurePaymentUrl(item: CartItem, adapter: ProviderAdapter, opts: ChargeOpts & { now: number }): Promise<CartItem> {
  if (!opts.paymentsEnabled || !needsRenewal(item, opts.now)) return item;
  const res = await adapter.charge(item, opts.urls);
  return res.kind === "payment_url" ? { ...item, status: "pending_payment", payment: { url: res.url, expiresAt: res.expiresAt } } : item;
}

/** REQ-107: cancela solo esa pieza con su proveedor; si falla, nada cambia. */
export async function cancelPiece(cart: Cart, itemId: string, adapter: ProviderAdapter): Promise<{ ok: boolean; cart: Cart }> {
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) return { ok: false, cart };
  try {
    const res = await adapter.cancel(item);
    if (!res.ok) return { ok: false, cart };
  } catch {
    return { ok: false, cart };
  }
  return { ok: true, cart: { ...cart, items: cart.items.map((i) => (i.id === itemId ? { ...i, status: "cancelled", payment: undefined } : i)) } };
}
