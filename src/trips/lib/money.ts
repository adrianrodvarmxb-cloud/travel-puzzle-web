/** Precios en pesos con la moneda original (gate E) y tipo de cambio FIX de Banxico (gate N). Puro. */
export interface FxRates { USD: number; EUR: number; date: string }
type Cur = "MXN" | "USD" | "EUR";

const SYMBOL: Record<Cur, string> = { MXN: "$", USD: "$", EUR: "€" };

export function toMXN(amount: number, currency: Cur, rates: FxRates | null): number | null {
  if (currency === "MXN") return Math.ceil(amount);
  if (!rates) return null;
  return Math.ceil(amount * rates[currency]);
}

export function formatMoney(amount: number, currency: Cur, lang = "es"): string {
  const whole = Number.isInteger(amount);
  const n = amount.toLocaleString(lang === "es" ? "es-MX" : "en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
  return `${currency} ${SYMBOL[currency]}${n}`;
}

const NOTE: Record<string, { fix: string; pay: string }> = {
  es: { fix: "Tipo de cambio FIX Banxico", pay: "Pagadero en pesos al tipo de cambio del día" },
  en: { fix: "Banxico FIX exchange rate", pay: "Payable in Mexican pesos at the day's exchange rate" },
  pt: { fix: "Câmbio FIX Banxico", pay: "Pagável em pesos mexicanos ao câmbio do dia" },
  de: { fix: "Banxico-FIX-Wechselkurs", pay: "Zahlbar in mexikanischen Pesos zum Tageskurs" },
  fr: { fix: "Taux de change FIX Banxico", pay: "Payable en pesos mexicains au taux du jour" },
  it: { fix: "Cambio FIX Banxico", pay: "Pagabile in pesos messicani al cambio del giorno" },
};

/** Lo que se muestra: pesos grande + original, o el original con la nota si no hay tipo de cambio. */
export function priceDisplay(amount: number | null, currency: Cur, rates: FxRates | null, lang = "es") {
  if (amount === null) return null;
  const note = NOTE[lang] ?? NOTE.en;
  if (currency === "MXN") return { main: formatMoney(Math.ceil(amount), "MXN", lang), original: null, rateNote: null };
  const mxn = toMXN(amount, currency, rates);
  if (mxn === null || !rates) return { main: formatMoney(amount, currency, lang), original: null, rateNote: note.pay };
  return { main: formatMoney(mxn, "MXN", lang), original: formatMoney(amount, currency, lang), rateNote: `${note.fix} ${rates.date}: ${rates[currency]}` };
}
