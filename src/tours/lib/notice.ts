/**
 * Aviso de la ficha calculado por evento (FREETOUR, precios en EUR). Puro.
 * El umbral de tarifa fija sale de fullPricePerGroup de cada evento; nunca es un número fijo.
 */
import { formatMoney, toMXN, type FxRates } from "@/trips/lib/money";

export const BASE_FREE_NOTICE: Record<"es" | "en", string> = {
  es: "Reservar es gratis; al final le das al guía lo que consideres justo. Cancelación gratis en cualquier momento.",
  en: "Booking is free; at the end you give the guide what you think is fair. Free cancellation at any time.",
};

const T = {
  es: {
    freeShort: "Reservar es gratis; al final le das al guía lo que consideres justo.",
    fixed: (n: number, price: string, mxn: string | null) => `Desde ${n} adultos aplica tarifa fija de ${price} EUR${mxn ? ` (aprox. ${mxn})` : ""}.`,
    cancel24: "Cancelación con reembolso hasta 24 h antes.",
    arrival: "Se paga en el punto de encuentro.",
  },
  en: {
    freeShort: "Booking is free; at the end you give the guide what you think is fair.",
    fixed: (n: number, price: string, mxn: string | null) => `From ${n} adults a fixed rate of ${price} EUR applies${mxn ? ` (approx. ${mxn})` : ""}.`,
    cancel24: "Refundable cancellation up to 24 h before.",
    arrival: "You pay at the meeting point.",
  },
};

const sizes = (map: Record<string, number>) =>
  Object.keys(map ?? {}).map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);

// REQ-096: el grupo más chico que ya paga, y cuánto paga.
export function fixedRateFrom(map: Record<string, number>): { n: number; price: number } | null {
  const n = sizes(map).find((k) => map[String(k)] > 0);
  return n === undefined ? null : { n, price: map[String(n)] };
}

export interface NoticeInput {
  fullPricePerGroup: Record<string, number>;
  payableNowPricePerGroup?: Record<string, number>;
  currency: "EUR";
  rates: FxRates | null;
  lang: string;
}

export interface EventNotice {
  lines: string[];
  /** 24 en tours de pago o con tarifa fija; null si se cancela gratis en cualquier momento. */
  cancellationHours: 24 | null;
  fixedFrom: { n: number; price: number } | null;
  payOnArrival: boolean;
}

const eur = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

// REQ-096 REQ-097
export function eventNotice({ fullPricePerGroup, payableNowPricePerGroup, currency, rates, lang }: NoticeInput): EventNotice {
  const t = lang === "es" ? T.es : T.en;
  const fixed = fixedRateFrom(fullPricePerGroup);
  if (!fixed) return { lines: [lang === "es" ? BASE_FREE_NOTICE.es : BASE_FREE_NOTICE.en], cancellationHours: null, fixedFrom: null, payOnArrival: false };

  const smallest = sizes(fullPricePerGroup)[0];
  const isPaidTour = fixed.n === smallest; // todos los grupos pagan
  const payNow = Object.values(payableNowPricePerGroup ?? {});
  const payOnArrival = isPaidTour && payNow.length > 0 && payNow.every((p) => p === 0);

  if (isPaidTour) {
    return { lines: [t.cancel24, ...(payOnArrival ? [t.arrival] : [])], cancellationHours: 24, fixedFrom: fixed, payOnArrival };
  }
  const mxn = toMXN(fixed.price, currency, rates);
  return {
    lines: [t.freeShort, t.fixed(fixed.n, eur(fixed.price), mxn === null ? null : formatMoney(mxn, "MXN", lang === "es" ? "es" : "en")), t.cancel24],
    cancellationHours: 24,
    fixedFrom: fixed,
    payOnArrival: false,
  };
}
