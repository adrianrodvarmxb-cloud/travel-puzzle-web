/**
 * Precios de BeMyGuest (REQ-022, gate B: neto + margen). Puro.
 * BMG da por categoría: nettPrice (lo que nos descuentan), retailPrice (sugerido) y
 * minimumSellingPrice (paridad: no se puede vender abajo).
 */
export type PaxCategory = "adult" | "child" | "senior";

export interface BmgRate { type: string; category: string; currency: string; amount: number }
export interface BmgPrice { id: string; rates: BmgRate[] }
export interface CategoryRates { nett: number; retail: number | null; minimum: number | null; currency: string }

export function ratesFor(price: BmgPrice, category: PaxCategory): CategoryRates | null {
  const pick = (type: string) => price.rates.find((r) => r.category === category && r.type === type);
  const nett = pick("nettPrice");
  if (!nett || !(nett.amount > 0)) return null;
  return {
    nett: nett.amount,
    retail: pick("retailPrice")?.amount ?? null,
    minimum: pick("minimumSellingPrice")?.amount ?? null,
    currency: nett.currency,
  };
}

/** Neto × (1 + margen), hacia arriba a unidades; nunca abajo del mínimo de venta ni del neto. */
export function sellPrice(r: { nett: number; minimum: number | null }, margin: number): number {
  const m = Number.isFinite(margin) && margin > 0 ? margin : 0;
  const withMargin = Math.ceil(Math.round(r.nett * (1 + m) * 100) / 100);
  return Math.max(withMargin, r.minimum ?? 0, Math.ceil(r.nett));
}

/** Precio que aplica: el ligado al horario (priceId) o, en productos de día completo, el primero. */
export function priceForSlot(
  day: { prices: BmgPrice[]; timeslots?: { uuid: string; priceId?: string }[] },
  timeslotUuid: string | null,
): BmgPrice | null {
  if (timeslotUuid) {
    const slot = day.timeslots?.find((s) => s.uuid === timeslotUuid);
    return slot?.priceId ? day.prices.find((p) => p.id === slot.priceId) ?? null : null;
  }
  return day.prices[0] ?? null;
}
