/**
 * Disponibilidad y precio por fecha, con la MISMA forma para todos los proveedores (REQ-3443..REQ-3445).
 *
 * Cada proveedor dice lo suyo a su manera: Tangol da tarifas con rango de fechas y bloqueos
 * (`GetTourRates`), Freetour da fechas de salida sueltas (`departureDates`). Aquí se traducen las dos a
 * una sola cosa —`PriceRule`— y de ahí sale el calendario del mes. Así la ficha pinta igual sea quien
 * sea el proveedor, y un proveedor nuevo solo necesita su propio traductor.
 *
 * Puro: sin red, sin base, sin reloj (el día de hoy entra por parámetro). El neto y el nombre del
 * proveedor no existen en esta capa (REQ-1543, REQ-1556).
 */
import { dayPrice, type DayAvailability as TripDayAvailability } from "../../trips/lib/day-price";

/** Una tarifa que vale para un tramo de fechas. `from`/`to` en null = vale siempre. */
export interface PriceRule {
  option: string | null;
  from: string | null;
  to: string | null;
  /** Precio público de adulto; null = se ofrece «por confirmar» (REQ-10650, G3). */
  adult: number | null;
  currency: string | null;
}

export interface Blackout { from: string; to: string }
export interface Availability { rules: readonly PriceRule[]; blackouts: readonly Blackout[] }

export interface DayAvailability {
  date: string;
  bookable: boolean;
  /** Precio público más bajo de ese día, o null si no se ofrece o está por confirmar. */
  from: number | null;
  currency: string | null;
  /** Se ofrece sin precio publicado: «precio por confirmar», se puede solicitar (REQ-10650, G3). */
  quote?: true;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const covers = (r: PriceRule, date: string) => (!r.from || date >= r.from) && (!r.to || date <= r.to);

/**
 * Calendario de un mes (`AAAA-MM`): por cada día, si se ofrece y su precio más bajo.
 * `today` es el día de hoy (AAAA-MM-DD) y `minDays` el aviso mínimo del proveedor en días.
 */
// REQ-3443, REQ-3445
export function monthAvailability(a: Availability, month: string, opts: { today: string; minDays?: number }): DayAvailability[] {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m || !DAY.test(opts.today)) return [];
  const year = Number(m[1]);
  const mon = Number(m[2]);
  if (mon < 1 || mon > 12) return [];
  const primeroOfrecible = addDays(opts.today, Math.max(0, opts.minDays ?? 0));

  const out: DayAvailability[] = [];
  for (let d = 1; d <= daysInMonth(year, mon); d++) {
    const date = `${m[1]}-${m[2]}-${String(d).padStart(2, "0")}`;
    const bloqueado = a.blackouts.some((b) => date >= b.from && date <= b.to);
    const alcanza = date >= primeroOfrecible;
    const cubren = bloqueado || !alcanza ? [] : a.rules.filter((r) => covers(r, date));
    const precios = cubren.flatMap((r) => (r.adult === null ? [] : [{ adult: r.adult, currency: r.currency }]));
    const mejor = precios.length ? precios.reduce((lo, x) => (x.adult < lo.adult ? x : lo)) : null;
    if (mejor) out.push({ date, bookable: true, from: mejor.adult, currency: mejor.currency });
    else if (cubren.length) out.push({ date, bookable: true, from: null, currency: cubren[0].currency, quote: true }); // REQ-10650 (G3)
    else out.push({ date, bookable: false, from: null, currency: null });
  }
  return out;
}

/** Traductor para proveedores que dan tarifas con rango de fechas (Tangol). */
// REQ-3444
export function fromDateRanges(
  rates: readonly { option: string | null; validFrom: string | null; validTo: string | null; rackAdult: number; currency: string | null }[],
  opts: { fallbackCurrency: string | null },
): PriceRule[] {
  return rates.map((r) => ({
    option: r.option ?? null,
    from: r.validFrom ?? null,
    to: r.validTo ?? null,
    adult: r.rackAdult,
    currency: r.currency ?? opts.fallbackCurrency,
  }));
}

/** Traductor para proveedores que dan fechas de salida sueltas (Freetour: `departureDates`). */
// REQ-3444
export function fromFixedDates(dates: readonly string[], price: { adult: number; currency: string | null }): PriceRule[] {
  return dates.filter((d) => DAY.test(d)).map((d) => ({ option: null, from: d, to: d, adult: price.adult, currency: price.currency }));
}

/**
 * Traductor para viajes de proveedores de PDF (REQ-10650; plan REQ-3454, G1 = A): el precio de cada día del mes sale de
 * `dayPrice` (temporada + recargos, vigencia, días de salida, «por confirmar»), una regla de un día por opción.
 * Así los viajes entran al mismo `monthAvailability` que Freetour y Tangol. Sin neto: `adult` es el precio final.
 */
// REQ-10650
export function fromTripAvailability(
  trip: { availability: TripDayAvailability; options: readonly { id: string; adult: number | null }[]; currency: string | null },
  month: string,
): Availability {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return { rules: [], blackouts: [] };
  const year = Number(m[1]);
  const mon = Number(m[2]);
  if (mon < 1 || mon > 12) return { rules: [], blackouts: [] };
  const rules: PriceRule[] = [];
  for (let d = 1; d <= daysInMonth(year, mon); d++) {
    const date = `${m[1]}-${m[2]}-${String(d).padStart(2, "0")}`;
    const porOpcion = trip.options.map((o) => ({ option: o.id, precio: dayPrice(date, trip.availability, o) }));
    const abiertas = porOpcion.flatMap((x) => (x.precio.status === "open" ? [{ option: x.option, adult: x.precio.adult }] : []));
    if (abiertas.length) {
      for (const x of abiertas) rules.push({ option: x.option, from: date, to: date, adult: x.adult, currency: trip.currency });
    } else if (porOpcion.some((x) => x.precio.status === "quote")) {
      rules.push({ option: null, from: date, to: date, adult: null, currency: trip.currency }); // G3: por confirmar
    }
  }
  return { rules, blackouts: [] };
}
