/** Solicitudes de cotización (gate M): calendario, estimado y folio. Puro. */
import { seasonFor, type Season } from "./pricing";

// REQ-117: "paid" lo pone el webhook de Stripe (también se puede elegir a mano).
export const REQUEST_STATUSES = ["new", "contacted", "quoted", "held", "paid", "closed"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = { new: "Nueva", contacted: "En contacto", quoted: "Cotizada", held: "Tarjeta retenida", paid: "Pagada", closed: "Cerrada" };

interface Availability { weekdays: number[]; slots: { time: string; capacity: number | null }[]; closedDates: string[] }

/** ¿Se puede pedir esa fecha? Día de la semana abierto, no cerrada, futura y con el aviso mínimo. */
export function isDateOpen(date: string, av: Availability, minNoticeHours: number, now: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T23:59:59Z`);
  if (Number.isNaN(d.getTime())) return false;
  if (d.getTime() - now.getTime() < minNoticeHours * 3600_000 || d.getTime() < now.getTime()) return false;
  if (av.closedDates.includes(date)) return false;
  return av.weekdays.length === 0 || av.weekdays.includes(new Date(`${date}T12:00:00Z`).getUTCDay());
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

/** Folio legible: SOL-AAAAMMDD-XXXX. */
export function requestRef(now: Date, random: string): string {
  const d = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `SOL-${d}-${random.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase()}`;
}
