/**
 * Precio de un tour de pago en la ficha (FREETOUR, regla D4): todos los cobros son en EUR, la conversión a
 * pesos es aproximada y puede haber comisiones del banco. Puro; se calcula en el servidor con idioma fijo
 * (INC-001) y el cliente solo pinta los textos.
 */
import { formatMoney, toMXN, type FxRates } from "@/trips/lib/money";

export interface TourPriceLabel {
  /** El precio con el que se calculó (el cliente solo lo usa si coincide con el del tour). */
  amount: number;
  main: string;
  approx: string | null;
  note: string;
}

const T: Record<"es" | "en", { approx: string; note: (approx: boolean) => string }> = {
  es: { approx: "aprox.", note: (a) => (a ? "Se cobra en EUR; la conversión a pesos es aproximada y tu banco puede aplicar comisiones." : "Se cobra en EUR; tu banco puede aplicar comisiones.") },
  en: { approx: "approx.", note: (a) => (a ? "Charged in EUR; the peso conversion is approximate and your bank may add fees." : "Charged in EUR; your bank may add fees.") },
};

// REQ-170
export function tourPriceLabel(price: number, currency: string, rates: FxRates | null, lang: string): TourPriceLabel | null {
  if (!Number.isFinite(price) || price <= 0) return null;
  if (currency !== "EUR" && currency !== "USD") return null;
  const t = lang === "es" ? T.es : T.en;
  const fmt = lang === "es" ? "es" : "en";
  const mxn = toMXN(price, currency, rates);
  const approx = mxn === null ? null : `${t.approx} ${formatMoney(mxn, "MXN", fmt)}`;
  const note = currency === "EUR" ? t.note(approx !== null) : (approx ? (lang === "es" ? "La conversión a pesos es aproximada." : "The peso conversion is approximate.") : "");
  return { amount: price, main: formatMoney(price, currency, fmt), approx, note };
}
