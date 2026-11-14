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

/** Una tarifa que vale para un tramo de fechas. `from`/`to` en null = vale siempre. */
export interface PriceRule {
  option: string | null;
  from: string | null;
  to: string | null;
  /** Precio público de adulto. */
  adult: number;
  currency: string | null;
}

export interface Blackout { from: string; to: string }
export interface Availability { rules: readonly PriceRule[]; blackouts: readonly Blackout[] }

export interface DayAvailability {
  date: string;
  bookable: boolean;
  /** Precio público más bajo de ese día, o null si no se ofrece. */
  from: number | null;
  currency: string | null;
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
    const precios = bloqueado || !alcanza ? [] : a.rules.filter((r) => covers(r, date)).map((r) => ({ adult: r.adult, currency: r.currency }));
    const mejor = precios.length ? precios.reduce((lo, x) => (x.adult < lo.adult ? x : lo)) : null;
    out.push(mejor ? { date, bookable: true, from: mejor.adult, currency: mejor.currency } : { date, bookable: false, from: null, currency: null });
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
