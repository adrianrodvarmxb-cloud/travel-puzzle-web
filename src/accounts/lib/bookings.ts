/**
 * REQ-1593: «Mis reservas» junta las reservas de tours y las solicitudes de viajes hechas con el mismo correo. Puro.
 * Orden: próximas primero (la más cercana arriba), luego las pasadas (la más reciente arriba); sin fecha, al final.
 */
export interface TourBookingRow {
  refNumber: string; manageToken: string; title: string; eventDate: string | null;
  status: string; paymentStatus: string | null; price: number; currency: string | null;
}
export interface TripRequestRow { ref: string; tripTitle: string; date: string; status: string; createdAt: Date }

export interface AccountBooking {
  kind: "tour" | "request"; ref: string; title: string; date: string | null;
  upcoming: boolean; statusLabel: string; href: string | null;
}

const REQUEST_STATUS: Record<string, string> = {
  new: "Solicitud recibida", contacted: "En contacto", quoted: "Cotizada", paid: "Pagada", closed: "Cerrada",
};

function tourStatus(r: TourBookingRow): string {
  if (r.status !== "active") return "Cancelada";
  if (r.paymentStatus === "pending" || r.paymentStatus === "review") return "Pago pendiente";
  if (r.paymentStatus === "expired") return "Pago vencido";
  return "Confirmada";
}

/** REQ-1593: D1 crudo puede entregar la fecha como Date; se normaliza a "AAAA-MM-DD[ HH:MM:SS]". */
export function dateText(v: unknown, withTime: boolean): string | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : withTime ? v.toISOString().slice(0, 19).replace("T", " ") : v.toISOString().slice(0, 10);
  return typeof v === "string" && v ? v : null;
}

/** "2026-12-01 10:00:00" o "2026-12-01" → milisegundos; NaN si no es fecha. */
function when(date: string | null): number {
  if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) return NaN;
  return Date.parse(`${date.slice(0, 10)}T${date.length >= 16 ? date.slice(11, 16) : "00:00"}:00Z`);
}

export function accountBookings(o: { tours: TourBookingRow[]; requests: TripRequestRow[]; now: Date }): AccountBooking[] {
  const items = [
    ...o.tours.map((r) => ({ d: dateText(r.eventDate, true), r })).map(({ d, r }) => ({ t: when(d), b: { kind: "tour" as const, ref: r.refNumber, title: r.title, date: d, statusLabel: tourStatus(r), href: `/reserva/${r.manageToken}` } })),
    ...o.requests.map((r) => ({ d: dateText(r.date, false), r })).map(({ d, r }) => ({ t: when(d), b: { kind: "request" as const, ref: r.ref, title: r.tripTitle, date: d, statusLabel: REQUEST_STATUS[r.status] ?? "En revisión", href: null } })),
  ];
  const today = o.now.getTime() - 24 * 3600 * 1000;
  const up = items.filter((i) => i.t >= today).sort((a, b) => a.t - b.t);
  const past = items.filter((i) => i.t < today).sort((a, b) => b.t - a.t);
  const none = items.filter((i) => Number.isNaN(i.t));
  return [...up.map((i) => ({ ...i.b, upcoming: true })), ...past.map((i) => ({ ...i.b, upcoming: false })), ...none.map((i) => ({ ...i.b, upcoming: false }))];
}
