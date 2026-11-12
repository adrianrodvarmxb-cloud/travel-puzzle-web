/**
 * Precio de un día para viajes de proveedores de PDF (REQ-3454, REQ-3456). Puro: sin reloj, sin red.
 *
 * Una sola fuente para el calendario y para el estimado de la solicitud (gate G1 = A, PO 12 nov 2026).
 * - G2: la temporada y los recargos obligatorios del día se SUMAN.
 * - G3: un día dentro de `quoteRanges` se ofrece con «precio por confirmar» (status "quote").
 * - G4: fuera de `validFrom`/`validTo` no se ofrece.
 * Sin los campos nuevos, el resultado es el de siempre (temporada como suplemento).
 */
import { seasonFor, type Season } from "./pricing";

export interface WeekdayRule { from: string; to: string; weekdays: number[] }
export interface Surcharge {
  name: string;
  from: string | null;
  to: string | null;
  /** Vacío = cualquier día de la semana. */
  weekdays: number[];
  amount: number;
  /** Monto distinto por opción (p. ej. individual). */
  byOption: Record<string, number>;
}
export interface DateRange { from: string; to: string }

export interface DayAvailability {
  weekdays: number[];
  closedDates: string[];
  seasons: Season[];
  validFrom?: string | null;
  validTo?: string | null;
  weekdayRules?: WeekdayRule[];
  surcharges?: Surcharge[];
  quoteRanges?: DateRange[];
}

export type DayPrice = { status: "open"; adult: number } | { status: "quote" | "closed"; adult: null };

const ISO = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const inRange = (date: string, from: string | null, to: string | null) => (!from || date >= from) && (!to || date <= to);

/** Fecha real (descarta 2027-02-30). */
function validDate(date: string): boolean {
  if (!ISO.test(date)) return false;
  return new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
}
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

// REQ-3454: ¿sale ese día? Una regla por periodo gana sobre los días base; sin días = cualquier día.
export function departsOn(date: string, av: DayAvailability): boolean {
  if (!validDate(date)) return false;
  const rule = (av.weekdayRules ?? []).find((r) => inRange(date, r.from, r.to));
  const days = rule ? rule.weekdays : av.weekdays;
  return days.length === 0 || days.includes(weekday(date));
}

// REQ-3454: ¿se ofrece la fecha? (vigencia, cierre y día de salida).
export function isOffered(date: string, av: DayAvailability): boolean {
  if (!validDate(date)) return false;
  if (!inRange(date, av.validFrom ?? null, av.validTo ?? null)) return false; // G4
  if (av.closedDates.includes(date)) return false;
  return departsOn(date, av);
}

// REQ-3454, REQ-3456: suma de temporada + recargos obligatorios del día para una opción (G2).
export function daySupplement(date: string, av: DayAvailability, optionId: string): number {
  const season = seasonFor(date, av.seasons)?.supplement ?? 0;
  const wd = weekday(date);
  const extra = (av.surcharges ?? [])
    .filter((s) => inRange(date, s.from, s.to) && (s.weekdays.length === 0 || s.weekdays.includes(wd)))
    .reduce((sum, s) => sum + (s.byOption[optionId] ?? s.amount), 0);
  return season + extra;
}

// REQ-3454: precio de adulto de un día para una opción.
export function dayPrice(date: string, av: DayAvailability, option: { id: string; adult: number | null }): DayPrice {
  if (!isOffered(date, av)) return { status: "closed", adult: null };
  if ((av.quoteRanges ?? []).some((r) => inRange(date, r.from, r.to))) return { status: "quote", adult: null }; // G3
  if (option.adult === null) return { status: "quote", adult: null };
  return { status: "open", adult: option.adult + daySupplement(date, av, option.id) };
}
