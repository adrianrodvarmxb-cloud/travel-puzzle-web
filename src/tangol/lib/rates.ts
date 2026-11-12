import type { TangolRate, TangolRates } from "./schemas";
import type { RangeRates } from "../../tours/lib/provider-availability";

export interface OptionSummary {
  code: string;
  description: string | null;
  startTime: string | null;
  /** Tarifa pública de adulto más baja de la opción. */
  fromAdult: number | null;
  hoursBooking: number | null;
  hoursCancelation: number | null;
}

export type RatesSummary = Omit<TangolRates, "options"> & { options: OptionSummary[]; fromAdult: number | null };

/** Resumen de tarifas para la ficha y el calendario: opciones, precio "desde" y bloqueos. */
// REQ-1542
export function summarizeRates(r: TangolRates): RatesSummary {
  const options: OptionSummary[] = r.options.map((o) => {
    const adults = r.rates.filter((x) => x.option === o.code).map((x) => x.rackAdult);
    return {
      code: o.code,
      description: o.description,
      startTime: o.startTime,
      fromAdult: adults.length ? Math.min(...adults) : null,
      hoursBooking: o.hoursBooking,
      hoursCancelation: o.hoursCancelation,
    };
  });
  const all = options.map((o) => o.fromAdult).filter((v): v is number => v !== null);
  return { ...r, options, fromAdult: all.length ? Math.min(...all) : null };
}

/** Una fecha (AAAA-MM-DD) se ofrece si alguna tarifa la cubre y no cae en un bloqueo. */
// REQ-1542
export function isDateBookable(s: Pick<TangolRates, "rates" | "blackouts">, date: string): boolean {
  if (s.blackouts.some((b) => date >= b.from && date <= b.to)) return false;
  return s.rates.some((r) => (!r.validFrom || date >= r.validFrom) && (!r.validTo || date <= r.validTo));
}

/**
 * Precio para el cliente: la tarifa pública de Tangol (comisionable 20 %). Regla de agencias con
 * comisión: se vende a su precio público; el neto nunca se muestra.
 */
// REQ-1543
export function publicPrice(rate: TangolRate): { adult: number; child: number | null; infant: number | null; currency: string | null } {
  return { adult: rate.rackAdult, child: rate.rackChild, infant: rate.rackInfant, currency: rate.currency };
}

/**
 * Tarifas de Tangol en la forma común que pinta el calendario de la ficha (`src/tours/lib/provider-availability.ts`).
 * Solo viajan tarifa pública, vigencia y bloqueos: el neto, la comisión y `Utilidad` ya no existen aquí
 * (los descarta `parseTourRates`, REQ-1543). El aviso mínimo es el de la opción MENOS exigente: si una
 * opción acepta con 12 h, el día se ofrece.
 */
// REQ-3468
export function rangeRatesFromTangol(r: TangolRates): RangeRates {
  const horas = r.options.map((o) => o.hoursBooking).filter((h): h is number => typeof h === "number");
  return {
    currency: r.currency,
    rates: r.rates.map((x) => ({ option: x.option, validFrom: x.validFrom, validTo: x.validTo, rackAdult: x.rackAdult, currency: x.currency })),
    blackouts: r.blackouts,
    hoursBooking: horas.length ? Math.min(...horas) : null,
  };
}
