import type { OctoPricing, OctoProduct } from "./schemas";

/**
 * Precios de Big Bus por OCTO. Regla de Ventrata (certificación de revendedores) y de la cuenta de socio de Big Bus
 * (Rositsa, 16 sep y 9 oct 2026): al cliente se le cobra el `retail`; el operador nos factura el `net`.
 * La diferencia es la comisión de Travel Puzzle (20 %). El `net` nunca sale al cliente.
 */

/** Unidades menores → importe (4900 con precisión 2 = 49.00). */
// REQ-3327
export function toMajor(minor: number, precision: number): number {
  return Math.round(minor) / 10 ** precision;
}

/** Lo que paga el cliente: siempre el retail que da la API, en su moneda. */
// REQ-3327
export function guestPrice(p: OctoPricing): { amount: number; currency: string } {
  return { amount: toMajor(p.retail, p.currencyPrecision), currency: p.currency };
}

/** Margen interno (retail − net), solo para conciliación. Null si la API no da net. */
// REQ-3327
export function internalMargin(p: OctoPricing): number | null {
  if (p.net == null) return null;
  return toMajor(p.retail - p.net, p.currencyPrecision);
}

/**
 * Se vende solo si TODAS las unidades de TODAS las opciones traen precio (Ventrata exige precios en el 100 %
 * de lo que se vende). Sin precio, el producto no se publica para compra directa.
 */
// REQ-3327
export function isFullyPriced(product: OctoProduct): boolean {
  if (product.pricingPer === "BOOKING") return product.options.every((o) => o.pricingFrom.length > 0);
  return product.options.every((o) => o.units.length > 0 && o.units.every((u) => u.pricingFrom.length > 0));
}

/**
 * Moneda en que se le piden los precios a Big Bus (decisión del PO, 12 nov 2026: «A», «lo haremos por API»):
 * dólares si el producto los ofrece; si no, euros o pesos; si no, su moneda base (y esa ciudad no se cobra directo).
 */
export const PREFERRED_CURRENCIES = ["USD", "EUR", "MXN"] as const;

// REQ-3436
export function chooseCurrency(product: Pick<OctoProduct, "availableCurrencies" | "defaultCurrency">): string | null {
  return PREFERRED_CURRENCIES.find((c) => product.availableCurrencies.includes(c)) ?? product.defaultCurrency ?? null;
}

/** Precio «desde» del producto: el retail de adulto más bajo entre sus opciones (indicativo, no final). */
// REQ-3327, REQ-3436: con `currency`, solo cuenta precios en esa moneda.
export function fromPrice(product: OctoProduct, currency?: string | null): { amount: number; currency: string } | null {
  let best: OctoPricing | null = null;
  for (const o of product.options) {
    const adult = o.units.find((u) => u.type === "ADULT") ?? o.units[0];
    for (const p of adult?.pricingFrom ?? []) {
      if (currency && p.currency !== currency) continue;
      if (!best || (p.currency === best.currency && p.retail < best.retail)) best = p;
    }
  }
  return best ? guestPrice(best) : null;
}
