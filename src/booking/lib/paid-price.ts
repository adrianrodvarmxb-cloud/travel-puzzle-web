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

export type PaidTerms =
  | { ok: true; isPaid: boolean; isPartial: boolean; fullPrice: number; payNow: number }
  | { ok: false; code: "children_not_allowed" };

/**
 * Condiciones de cobro a partir del precio del grupo ya calculado por `checkEvent` (REQ-810, lectura conservadora).
 * Un tour de pago no admite niños (error 45 de Freetour), así que con precio > 0 solo hay adultos y la llave de
 * `payableNowPricePerGroup` es el número de adultos sin ambigüedad. `payNow` = 0 con precio > 0 es pago a la llegada (D7).
 */
// REQ-930
// REQ-064: lo que se cobra hoy sale de payableNowPricePerGroup (evita el error 33 de v2.2).
export function paidTerms(ev: EventPrices, adults: number, children: number, fullPrice: number): PaidTerms {
  if (!(fullPrice > 0)) return { ok: true, isPaid: false, isPartial: false, fullPrice: 0, payNow: 0 };
  if (children > 0) return { ok: false, code: "children_not_allowed" };
  const raw = ev.payableNowPricePerGroup?.[String(adults)];
  const payNow = typeof raw === "number" && Number.isFinite(raw) && raw >= 0 ? Math.min(raw, fullPrice) : fullPrice;
  return { ok: true, isPaid: true, isPartial: Boolean(ev.isPartiallyPaid) && payNow > 0 && payNow < fullPrice, fullPrice, payNow };
}

/** ¿El grupo paga? Misma lectura conservadora que `checkEvent` (REQ-810): por adultos o por adultos + niños. */
// REQ-935
export function groupIsPaid(table: Record<string, number> | undefined, adults: number, children: number): boolean {
  if (!table) return false;
  return [table[String(adults)], table[String(adults + children)]].some((p) => typeof p === "number" && p > 0);
}
