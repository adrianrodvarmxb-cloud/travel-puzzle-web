/** Precio de un evento de Freetour para un grupo (API v2.0). Puro. */

export interface EventPrices {
  fullPricePerGroup: Record<string, number>;
  payableNowPricePerGroup: Record<string, number>;
  isPartiallyPaid: boolean;
}

export type PriceResult =
  | { ok: true; isPaid: boolean; isPartial: boolean; fullPrice: number; payNow: number }
  | { ok: false; code: "no_price" | "children_not_allowed" };

/**
 * La tabla de Freetour va por número de ADULTOS. Se cobra hoy `payableNowPricePerGroup`;
 * los tours de pago no aceptan niños (error 45).
 */
// REQ-010
export function pricesFor(ev: EventPrices, adults: number, children: number): PriceResult {
  const table = ev.fullPricePerGroup ?? {};
  if (!Object.keys(table).length) return { ok: true, isPaid: false, isPartial: false, fullPrice: 0, payNow: 0 };
  const fullPrice = table[String(adults)];
  if (fullPrice === undefined) return { ok: false, code: "no_price" };
  if (fullPrice === 0) return { ok: true, isPaid: false, isPartial: false, fullPrice: 0, payNow: 0 };
  if (children > 0) return { ok: false, code: "children_not_allowed" };
  const payNow = ev.payableNowPricePerGroup?.[String(adults)] ?? fullPrice;
  return { ok: true, isPaid: true, isPartial: Boolean(ev.isPartiallyPaid) && payNow < fullPrice, fullPrice, payNow };
}
