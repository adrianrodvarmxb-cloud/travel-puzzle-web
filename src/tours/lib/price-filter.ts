/**
 * REQ-1254 / REQ-1255: rango de precio de /tours en la moneda con la que filtra el catálogo (EUR, la del proveedor),
 * con MXN aproximado como las tarjetas («Desde MXN $X · EUR €Y»). Puro y determinista (INC-001): sin Intl ni toLocale*.
 */
import { formatCount } from "@/home/lib/format";
import type { FxRates } from "@/trips/lib/money";

export const PRICE_FILTER_CURRENCY = "EUR";

// REQ-1255: monto en EUR con el tipo de cambio del día (MXN por unidad); sin tipo de cambio, el monto tal cual.
export function priceInEur(amount: number | null | undefined, currency: string | null | undefined, fx: FxRates | null): number | null {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return null;
  const cur = (currency ?? "EUR").toUpperCase();
  if (cur === "EUR" || !fx || !(fx.EUR > 0)) return amount;
  const mxn = cur === "MXN" ? amount : cur === "USD" && fx.USD > 0 ? amount * fx.USD : null;
  return mxn === null ? amount : Math.round(mxn / fx.EUR);
}

// REQ-1254
export function priceStopLabel(eur: number, plus: boolean, mxnPerEur: number | null | undefined, lang: string): string {
  const p = plus ? "+" : "";
  const base = `€${formatCount(eur, lang)}${p}`;
  if (!mxnPerEur || !(mxnPerEur > 0) || eur <= 0) return base;
  const approx = lang === "es" ? "aprox." : "approx.";
  return `${base} · ${approx} MXN $${formatCount(Math.round(eur * mxnPerEur), lang)}${p}`;
}
