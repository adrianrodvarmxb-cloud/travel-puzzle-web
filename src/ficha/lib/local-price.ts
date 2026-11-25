/**
 * REQ-10823 · Ficha única, ola 6 (plan §2: `lib/local-price.ts`). Decisión 32 (REQ-10610, PO 14-11-2026): «Primero la
 * moneda local del visitante según su país; después la del proveedor». Plan §4: «Moneda del visitante, luego la del
 * proveedor; siempre dice la moneda del cargo; sin dato de cambio no convierte».
 * - El país del visitante llega por parámetro (lo lee el borde, `src/geo/lib/visitor-country.ts` en la ola 9); aquí
 *   solo se traduce a moneda. País desconocido → moneda del proveedor.
 * - La tabla de cambio llega por parámetro (Banxico hoy; Frankfurter/BCE en la ola 9, REQ-10767) con su base; sin
 *   tasa para alguna de las dos monedas no se convierte y se muestra el precio del proveedor.
 * - Lo convertido es aproximado y se redondea hacia arriba; la moneda del cargo siempre se dice (REQ-10767: conversión
 *   «aproximada»). Nunca neto ni margen: el precio que entra ya es el público.
 * - Sin `Intl` (INC-001): formato propio. Puro.
 */
import type { FichaLang, FichaPrice } from "./model";

export interface FxTable { base: string; date: string; rates: Record<string, number> }

export interface LocalPrice {
  shown: { amount: number; currency: string; approx: boolean };
  /** Lo que de verdad se cobra; null si es gratis. */
  charge: { amount: number; currency: string } | null;
  text: string;
}

/** Moneda por país del visitante (ISO 3166-1 alfa-2 → ISO 4217). Solo países con moneda propia conocida. */
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  MX: "MXN", US: "USD", CA: "CAD", GB: "GBP", CH: "CHF", JP: "JPY", CN: "CNY", AU: "AUD", NZ: "NZD",
  AR: "ARS", BR: "BRL", CL: "CLP", CO: "COP", PE: "PEN", UY: "UYU", PY: "PYG", BO: "BOB", EC: "USD", PA: "USD",
  CR: "CRC", GT: "GTQ", DO: "DOP", IN: "INR", KR: "KRW", SG: "SGD", MY: "MYR", TH: "THB", ID: "IDR", PH: "PHP",
  VN: "VND", TR: "TRY", ZA: "ZAR", EG: "EGP", MA: "MAD", AE: "AED", IL: "ILS", NO: "NOK", SE: "SEK", DK: "DKK",
  PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON",
  // Zona euro
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", PT: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", IE: "EUR", FI: "EUR",
  GR: "EUR", LU: "EUR", SK: "EUR", SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", HR: "EUR", MT: "EUR", CY: "EUR",
};

// REQ-10823
export function visitorCurrency(countryCode: string | null | undefined): string | null {
  const c = (countryCode ?? "").trim().toUpperCase();
  return c ? CURRENCY_BY_COUNTRY[c] ?? null : null;
}

/** Convierte por la tabla (ambas monedas contra la base) a unidades enteras hacia arriba, como `toMXN`; null si falta una tasa. */
// REQ-10823
export function convert(amount: number, from: string, to: string, fx: FxTable | null): number | null {
  if (from === to) return amount;
  if (!fx) return null;
  const rate = (c: string): number | null => (c === fx.base ? 1 : Number.isFinite(fx.rates[c]) && fx.rates[c] > 0 ? fx.rates[c] : null);
  const rf = rate(from), rt = rate(to);
  if (rf === null || rt === null) return null;
  // REQ-10874: sin ruido de coma flotante (100 × 1.1 = 110.00000000000001 no debe subir a 111).
  return Math.ceil(Number(((amount / rf) * rt).toFixed(6)));
}

const SYMBOL: Record<string, string> = { MXN: "$", USD: "$", ARS: "$", CLP: "$", COP: "$", UYU: "$", CAD: "$", AUD: "$", NZD: "$", SGD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥", INR: "₹", KRW: "₩", BRL: "", CHF: "" };

/** «MXN $1,782» · miles con coma y hasta dos decimales, sin `Intl`. */
// REQ-10823
export function formatAmount(amount: number, currency: string, lang: FichaLang | string): string {
  void lang; // el separador es el mismo en todos los idiomas del sitio (coma de miles, punto decimal), como en la ficha de hoy
  const fixed = Number.isInteger(amount) ? String(amount) : (Math.round(amount * 100) / 100).toFixed(2);
  const [int, dec] = fixed.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sym = SYMBOL[currency] ?? "";
  return `${currency} ${sym}${grouped}${dec ? `.${dec}` : ""}`;
}

interface Copy { approx: string; charged: string; free: string; per: Record<FichaPrice["per"], string> }
const COPY: Record<FichaLang, Copy> = {
  es: { approx: "aprox.", charged: "se cobra en", free: "Gratis", per: { person: "por persona", group: "por grupo", total: "en total" } },
  en: { approx: "approx.", charged: "charged in", free: "Free", per: { person: "per person", group: "per group", total: "in total" } },
  pt: { approx: "aprox.", charged: "cobrado em", free: "Grátis", per: { person: "por pessoa", group: "por grupo", total: "no total" } },
  fr: { approx: "env.", charged: "facturé en", free: "Gratuit", per: { person: "par personne", group: "par groupe", total: "au total" } },
  de: { approx: "ca.", charged: "abgerechnet in", free: "Kostenlos", per: { person: "pro Person", group: "pro Gruppe", total: "insgesamt" } },
  it: { approx: "circa", charged: "addebitato in", free: "Gratis", per: { person: "a persona", group: "a gruppo", total: "in totale" } },
};

/** Precio que ve el visitante: en su moneda si se puede convertir, si no en la del proveedor; siempre con la del cargo. */
// REQ-10823
export function localPrice(price: FichaPrice, ctx: { visitorCountry: string | null | undefined; fx: FxTable | null; lang: FichaLang }): LocalPrice {
  const c = COPY[ctx.lang] ?? COPY.en;
  if (price.amount <= 0) return { shown: { amount: 0, currency: price.currency, approx: false }, charge: null, text: c.free };
  const target = visitorCurrency(ctx.visitorCountry);
  const charge = { amount: price.amount, currency: price.currency };
  // REQ-10874 / REQ-10767: la moneda del visitante; si no hay tasa para ella, USD; si tampoco, la del proveedor.
  const candidates = target ? [target, "USD"] : [];
  for (const cur of candidates) {
    if (cur === price.currency) break;
    const converted = convert(price.amount, price.currency, cur, ctx.fx);
    if (converted !== null) {
      const shownAmount = Math.ceil(converted);
      return {
        shown: { amount: shownAmount, currency: cur, approx: true },
        charge,
        text: `${formatAmount(shownAmount, cur, ctx.lang)} ${c.approx} ${c.per[price.per]} · ${c.charged} ${formatAmount(price.amount, price.currency, ctx.lang)}`,
      };
    }
  }
  return {
    shown: { amount: price.amount, currency: price.currency, approx: false },
    charge,
    text: `${formatAmount(price.amount, price.currency, ctx.lang)} ${c.per[price.per]} · ${c.charged} ${price.currency}`,
  };
}

/** REQ-10874: ruta que la ficha le da al navegador para pedir su precio local (sin país: lo lee el borde en la ruta). */
// REQ-10874
export function localPriceUrl(price: FichaPrice, lang: FichaLang): string {
  const p = new URLSearchParams({ amount: String(price.amount), currency: price.currency, per: price.per, lang });
  return `/api/precio-local?${p.toString()}`;
}

/** Tabla de la ficha desde las tasas de Banxico (MXN por USD y por EUR): base MXN y cada moneda «por un peso». */
// REQ-10859
export function fxTableFromMxn(fx: { USD: number; EUR: number; date: string } | null | undefined): FxTable | null {
  if (!fx) return null;
  const rates: Record<string, number> = {};
  if (Number.isFinite(fx.USD) && fx.USD > 0) rates.USD = 1 / fx.USD;
  if (Number.isFinite(fx.EUR) && fx.EUR > 0) rates.EUR = 1 / fx.EUR;
  return { base: "MXN", date: fx.date, rates };
}
