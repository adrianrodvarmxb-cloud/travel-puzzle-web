/** Solicitudes de cotización (gate M): calendario, estimado y folio. Puro. */
import { seasonFor, type Season } from "./pricing";
import { dayPrice, isOffered, type DayAvailability } from "./day-price";

// REQ-117: "paid" lo pone el webhook de Stripe (también se puede elegir a mano).
export const REQUEST_STATUSES = ["new", "contacted", "quoted", "paid", "closed"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = { new: "Nueva", contacted: "En contacto", quoted: "Cotizada", paid: "Pagada", closed: "Cerrada" };

interface Availability extends Omit<DayAvailability, "seasons"> { slots: { time: string; capacity: number | null }[]; seasons?: Season[] }

/** ¿Se puede pedir esa fecha? Día de la semana abierto, no cerrada, futura y con el aviso mínimo. */
export function isDateOpen(date: string, av: Availability, minNoticeHours: number, now: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T23:59:59Z`);
  if (Number.isNaN(d.getTime())) return false;
  if (d.getTime() - now.getTime() < minNoticeHours * 3600_000 || d.getTime() < now.getTime()) return false;
  // REQ-3454: cierre, días de salida (también por periodo) y vigencia del tarifario.
  return isOffered(date, { ...av, seasons: av.seasons ?? [] });
}

export function availableTimes(date: string, av: Availability, minNoticeHours: number, now: Date): string[] {
  return isDateOpen(date, av, minNoticeHours, now) ? av.slots.map((s) => s.time).sort() : [];
}

/** Estimado: adultos (+ suplemento de temporada) + niños + infantes. null si falta algún precio. */
export function estimate(
  option: { adult: number | null; child: number | null; infant: number | null } | null,
  pax: { adults: number; children: number; infants: number },
  date: string,
  seasons: Season[]
): number | null {
  if (!option || option.adult === null) return null;
  if (pax.children > 0 && option.child === null) return null;
  if (pax.infants > 0 && option.infant === null) return null;
  const sup = seasonFor(date, seasons)?.supplement ?? 0;
  return pax.adults * (option.adult + sup) + pax.children * (option.child ?? 0) + pax.infants * (option.infant ?? 0);
}

/**
 * REQ-3454: estimado con el precio del día (temporada + recargos que se suman, por opción).
 * Un día «por confirmar» (G3) o sin precio de adulto no se estima. Sin campos nuevos = `estimate`.
 */
export function estimateFor(
  option: { id: string; adult: number | null; child: number | null; infant: number | null } | null,
  pax: { adults: number; children: number; infants: number },
  date: string,
  av: DayAvailability
): number | null {
  if (!option || option.adult === null) return null;
  if (pax.children > 0 && option.child === null) return null;
  if (pax.infants > 0 && option.infant === null) return null;
  const day = dayPrice(date, { ...av, validFrom: null, validTo: null, closedDates: [], weekdays: [], weekdayRules: [] }, option);
  if (day.status !== "open") return null;
  return pax.adults * day.adult + pax.children * (option.child ?? 0) + pax.infants * (option.infant ?? 0);
}

/** Folio legible: SOL-AAAAMMDD-XXXX. */
export function requestRef(now: Date, random: string): string {
  const d = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `SOL-${d}-${random.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase()}`;
}
