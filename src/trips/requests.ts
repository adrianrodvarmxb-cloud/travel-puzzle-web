/** Solicitudes de cotización (gate M): validar contra el viaje, guardar y avisar. Dependencias por parámetro. */
import { isDateOpen, availableTimes, estimate, requestRef } from "./lib/request";
import { buildRequestCustomerEmail, buildRequestTeamEmail } from "./lib/request-email";
import { formatMoney } from "./lib/money";
import type { RequestInput } from "./schemas/request";
import type { TripOption, Season } from "./lib/pricing";

interface PublicTrip {
  id: string; code: string; titleEs: string; kind: string; currency: "MXN" | "USD" | "EUR"; minNoticeHours: number; path: string;
  options: TripOption[]; availability: { weekdays: number[]; slots: { time: string; capacity: number | null }[]; closedDates: string[]; seasons: Season[] };
}
type Mail = { to: string; subject: string; html: string; text: string };

export interface RequestDeps {
  now: Date; random: () => string; siteUrl: string; whatsapp?: string;
  /** Solo viajes publicados. */
  findTrip(id: string): Promise<PublicTrip | null>;
  save(row: Record<string, unknown>): Promise<void>;
  sendCustomer(m: Mail): Promise<unknown>;
  sendTeam(m: Omit<Mail, "to">): Promise<unknown>;
}

const paxText = (r: RequestInput) =>
  [`${r.adults} ${r.adults === 1 ? "adulto" : "adultos"}`, r.children ? `${r.children} ${r.children === 1 ? "niño" : "niños"} (${r.childAges.join(", ")})` : "", r.infants ? `${r.infants} ${r.infants === 1 ? "infante" : "infantes"}` : ""].filter(Boolean).join(", ");

export async function submitRequest(r: RequestInput, d: RequestDeps): Promise<{ ok: true; ref: string } | { ok: false; error: string }> {
  const trip = await d.findTrip(r.tripId);
  if (!trip) return { ok: false, error: "Este viaje ya no está disponible." };

  let option: TripOption | null = null;
  let est: number | null = null;
  let when: string;
  if (r.kind === "reserva") {
    if (!isDateOpen(r.date, trip.availability, trip.minNoticeHours, d.now)) return { ok: false, error: "Esa fecha no está disponible. Elige otra." };
    const times = availableTimes(r.date, trip.availability, trip.minNoticeHours, d.now);
    if (times.length && !times.includes(r.time)) return { ok: false, error: "Ese horario no está disponible." };
    option = trip.options.find((o) => o.id === r.optionId) ?? trip.options[0] ?? null;
    if (option && r.childAges.some((a) => a < option!.childAgeMin || a > option!.childAgeMax)) {
      return { ok: false, error: `Los niños de esta opción son de ${option.childAgeMin} a ${option.childAgeMax} años; los mayores cuentan como adultos.` };
    }
    est = estimate(option, r, r.date, trip.availability.seasons);
    when = r.time ? `${r.date} · ${r.time}` : r.date;
  } else {
    when = `${r.startDate} → ${r.endDate} · ${r.serviceType === "private" ? "Privado" : "En grupo"}`;
  }

  const ref = requestRef(d.now, d.random());
  await d.save({
    ref, tripId: trip.id, tripCode: trip.code, tripTitle: trip.titleEs, kind: r.kind, status: "new",
    date: r.kind === "reserva" ? r.date : r.startDate, endDate: r.kind === "personalizado" ? r.endDate : null, time: r.kind === "reserva" ? r.time : "",
    serviceType: r.kind === "personalizado" ? r.serviceType : option?.mode ?? null, optionId: option?.id ?? null, optionName: option?.name ?? null,
    adults: r.adults, children: r.children, infants: r.infants, childAges: r.childAges,
    firstName: r.firstName, lastName: r.lastName, email: r.email, phone: r.phone, hotel: r.hotel, comments: r.comments, language: r.language,
    estimate: est, currency: trip.currency, consent: true,
  });

  const site = d.siteUrl.replace(/\/+$/, "");
  const summary = {
    ref, tripTitle: trip.titleEs, tripCode: trip.code, tripUrl: `${site}${trip.path}`, kind: r.kind, when, option: option?.name ?? null, pax: paxText(r),
    estimate: est !== null ? formatMoney(est, trip.currency, r.language) : null, name: `${r.firstName} ${r.lastName}`, email: r.email, phone: r.phone,
    hotel: r.hotel, comments: r.comments, logoUrl: `${site}/brand/logo-tp-oscuro.png`, whatsapp: d.whatsapp, adminUrl: `${site}/admin/solicitudes`,
  };
  // Los correos nunca tumban la solicitud (ya quedó guardada).
  await Promise.all([
    d.sendCustomer({ to: r.email, ...buildRequestCustomerEmail(summary, r.language) }).catch((e) => console.error(`[solicitudes] correo al cliente ${ref}:`, (e as Error).message)),
    d.sendTeam(buildRequestTeamEmail(summary)).catch((e) => console.error(`[solicitudes] aviso al equipo ${ref}:`, (e as Error).message)),
  ]);
  return { ok: true, ref };
}
