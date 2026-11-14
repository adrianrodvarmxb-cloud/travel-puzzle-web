import type { TangolRate, TangolRates } from "./schemas";
import { parseOperationDays, weekdayOf } from "./operation-days";

export interface OptionSummary {
  code: string;
  description: string | null;
  startTime: string | null;
  /** Tarifa pública de adulto más baja de la opción. */
  fromAdult: number | null;
  hoursBooking: number | null;
  hoursCancelation: number | null;
  /** REQ-10513: días de operación (0 = domingo … 6 = sábado) o null si Tangol no los manda o no se entendieron. */
  operationDays: number[] | null;
  operationDaysRaw: string | null;
}

export type RatesSummary = Omit<TangolRates, "options"> & { options: OptionSummary[]; fromAdult: number | null };

/** Resumen de tarifas para la ficha y el calendario: opciones, precio "desde" y bloqueos. */
// REQ-1542, REQ-10513
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
      operationDays: parseOperationDays(o.operationDaysRaw),
      operationDaysRaw: o.operationDaysRaw ?? null,
    };
  });
  const all = options.map((o) => o.fromAdult).filter((v): v is number => v !== null);
  return { ...r, options, fromAdult: all.length ? Math.min(...all) : null };
}

type BookableInput = Pick<TangolRates, "rates" | "blackouts"> & { options?: readonly Pick<OptionSummary, "code" | "startTime" | "hoursBooking" | "operationDays">[] };

/** Una tarifa cubre la fecha si está dentro de su vigencia (sin fechas = siempre). */
const covers = (r: Pick<TangolRate, "validFrom" | "validTo">, date: string) => (!r.validFrom || date >= r.validFrom) && (!r.validTo || date <= r.validTo);

/** Hora de salida de la opción en la fecha, en UTC (Tangol no manda zona; la anticipación se mide contra eso). */
const startAt = (date: string, startTime: string | null) => {
  const hm = /^(\d{1,2}):(\d{2})/.exec(startTime ?? "");
  const t = hm ? `${hm[1].padStart(2, "0")}:${hm[2]}` : "00:00";
  return Date.parse(`${date}T${t}:00Z`);
};

/**
 * Una fecha (AAAA-MM-DD) se ofrece si alguna tarifa la cubre y no cae en un bloqueo.
 * REQ-10513: con `{ now }` además debe caer en un día de operación de una opción con tarifa vigente
 * (una opción sin días entendidos no restringe) y respetar su anticipación `hoursBooking`.
 * Sin `options` en la entrada manda la regla vieja.
 */
// REQ-1542, REQ-10513
export function isDateBookable(s: BookableInput, date: string, opts?: { now: Date }): boolean {
  if (s.blackouts.some((b) => date >= b.from && date <= b.to)) return false;
  if (!opts || !s.options?.length) return s.rates.some((r) => covers(r, date));
  const weekday = weekdayOf(date);
  if (weekday === null) return false;
  return s.options.some((o) => {
    if (!s.rates.some((r) => r.option === o.code && covers(r, date))) return false;
    if (o.operationDays && !o.operationDays.includes(weekday)) return false;
    if (o.hoursBooking !== null && o.hoursBooking !== undefined) {
      return startAt(date, o.startTime) - opts.now.getTime() >= o.hoursBooking * 3_600_000;
    }
    return true;
  });
}

export interface AvailabilityRules {
  options: { code: string; startTime: string | null; operationDays: number[] | null; operationDaysRaw: string | null; hoursBooking: number | null; hoursCancelation: number | null }[];
  /** Vigencia de las tarifas por opción (sin montos). */
  validity: { option: string; from: string | null; to: string | null }[];
  blackouts: { from: string; to: string }[];
}

/**
 * REQ-10513: lo que hace falta guardar en `Tour.availabilityRules` para calcular disponibilidad después,
 * sin un solo campo de dinero (REQ-1543). Las vigencias repetidas (una por rango de pasajeros) se colapsan.
 */
// REQ-10513
export function availabilityRules(s: RatesSummary): AvailabilityRules {
  const validity: AvailabilityRules["validity"] = [];
  for (const r of s.rates) {
    const v = { option: r.option, from: r.validFrom, to: r.validTo };
    if (!validity.some((x) => x.option === v.option && x.from === v.from && x.to === v.to)) validity.push(v);
  }
  return {
    options: s.options.map((o) => ({
      code: o.code, startTime: o.startTime, operationDays: o.operationDays, operationDaysRaw: o.operationDaysRaw,
      hoursBooking: o.hoursBooking, hoursCancelation: o.hoursCancelation,
    })),
    validity,
    blackouts: s.blackouts.map((b) => ({ from: b.from, to: b.to })),
  };
}

/**
 * Precio para el cliente: la tarifa pública de Tangol (comisionable 20 %). Regla de agencias con
 * comisión: se vende a su precio público; el neto nunca se muestra.
 */
// REQ-1543
export function publicPrice(rate: TangolRate): { adult: number; child: number | null; infant: number | null; currency: string | null } {
  return { adult: rate.rackAdult, child: rate.rackChild, infant: rate.rackInfant, currency: rate.currency };
}
