/**
 * Del dato de cada proveedor al calendario común (REQ-3468, REQ-3470, REQ-3471).
 *
 * El calendario y los traductores ya existen en `date-availability.ts` (REQ-3443…REQ-3445): aquí solo se
 * elige el traductor que toca al proveedor y se arma la ventana de meses que pinta la ficha.
 *
 * Puro: sin red, sin base y sin reloj (el día de hoy entra por parámetro). El neto, la comisión y el
 * nombre del proveedor no existen en esta capa (REQ-1543, REQ-1556).
 */
import {
  fromDateRanges,
  fromFixedDates,
  monthAvailability,
  type Availability,
  type DayAvailability,
} from "./date-availability";

/** Tarifas con rango de fechas, ya sin netos (forma de `parseTourRates`, `src/tangol/lib/schemas.ts`). */
export interface RangeRates {
  currency: string | null;
  rates: readonly { option: string | null; validFrom: string | null; validTo: string | null; rackAdult: number; currency: string | null }[];
  blackouts: readonly { from: string; to: string }[];
  /** Aviso mínimo del proveedor, en horas (de la opción; `null` si no lo dice). */
  hoursBooking?: number | null;
}

/** Fechas de salida sueltas con un precio (forma de Freetour: `departureDates`). */
export interface FixedDates {
  dates: readonly string[];
  adult: number;
  currency: string | null;
}

export interface MonthAvailability {
  month: string;
  days: DayAvailability[];
}

export interface ProviderCalendar {
  months: MonthAvailability[];
  currency: string | null;
  /** Índice del primer mes con alguna fecha que se ofrece. */
  start: number;
}

/**
 * Cómo dice cada proveedor su disponibilidad. Un proveedor nuevo se suma aquí y en ningún otro lado (OCP).
 * Por omisión, fechas sueltas: es lo que guarda la base para todos los demás.
 */
const POR_PROVEEDOR: Readonly<Record<string, "ranges" | "fixed-dates">> = { tangol: "ranges" };

// REQ-3468
export function availabilityKind(providerId: string): "ranges" | "fixed-dates" {
  return POR_PROVEEDOR[providerId] ?? "fixed-dates";
}

/** El calendario de proveedor vive tras su bandera; apagada, la ficha queda como hoy (REQ-3471). */
// REQ-3471
export function isProviderCalendarEnabled(value: string | undefined): boolean {
  return value === "true";
}

/** Aviso mínimo en horas → días completos que hay que esperar (24 h = 1 día; 25 h ya son 2). */
// REQ-3468
export function minAdvanceDays(hoursBooking: number | null | undefined): number {
  if (!hoursBooking || hoursBooking <= 0) return 0;
  return Math.ceil(hoursBooking / 24);
}

// REQ-3468
export function availabilityFromRanges(r: RangeRates): Availability {
  return { rules: fromDateRanges(r.rates, { fallbackCurrency: r.currency }), blackouts: r.blackouts };
}

// REQ-3468
export function availabilityFromDates(f: FixedDates): Availability {
  return { rules: fromFixedDates(f.dates, { adult: f.adult, currency: f.currency }), blackouts: [] };
}

/** Fechas de salida como las guarda la base: arreglo o texto JSON. Lo que no sea fecha se descarta. */
// REQ-3468
export function datesFromJson(v: unknown): string[] {
  let a: unknown = v;
  if (typeof v === "string") {
    try {
      a = JSON.parse(v);
    } catch {
      return [];
    }
  }
  return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}/.test(x)).map((x) => x.slice(0, 10)) : [];
}

/** Los `n` meses (AAAA-MM) que arrancan en el mes de `today`. */
// REQ-3468
export function monthsFrom(today: string, n: number): string[] {
  const m = /^(\d{4})-(\d{2})/.exec(today);
  if (!m) return [];
  let year = Number(m[1]);
  let mon = Number(m[2]);
  const out: string[] = [];
  for (let i = 0; i < Math.max(0, n); i++) {
    out.push(`${year}-${String(mon).padStart(2, "0")}`);
    mon += 1;
    if (mon > 12) {
      mon = 1;
      year += 1;
    }
  }
  return out;
}

/**
 * Ventana de meses con su precio por día. Devuelve `null` si en toda la ventana no hay un solo día que se
 * ofrezca: así la ficha se queda con su precio «desde» y no se pinta una fachada vacía (REQ-3470).
 */
// REQ-3468, REQ-3470
export function buildCalendar(
  a: Availability,
  opts: { today: string; months: number; minDays?: number; currency: string | null },
): ProviderCalendar | null {
  const months = monthsFrom(opts.today, opts.months).map((month) => ({
    month,
    days: monthAvailability(a, month, { today: opts.today, minDays: opts.minDays }),
  }));
  const start = months.findIndex((m) => m.days.some((d) => d.bookable));
  if (start < 0) return null;
  const moneda = months.flatMap((m) => m.days).find((d) => d.bookable && d.currency)?.currency ?? opts.currency;
  return { months, currency: moneda, start };
}
