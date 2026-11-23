/**
 * Calendario con precio por día de un viaje de proveedor de PDF (REQ-10863; plan REQ-3454, G1–G5 = A).
 *
 * Une lo que ya existe: `fromTripAvailability` (REQ-10650) traduce la disponibilidad del viaje a la forma común
 * mes por mes, y `buildCalendar` (REQ-3468) arma la ventana de meses igual que para Tangol y Freetour. Así la
 * ficha de un viaje pinta el MISMO calendario que la de un tour, con el mismo componente.
 *
 * Puro: sin red, sin base y sin reloj (el día de hoy entra por parámetro, INC-001). Solo precios públicos:
 * `options[].adult` es lo que ve el cliente; el neto no existe en esta capa (REQ-1543, REQ-1556).
 */
import { fromTripAvailability } from "../../tours/lib/date-availability";
import { buildCalendar, minAdvanceDays, type ProviderCalendar } from "../../tours/lib/provider-availability";
import type { DayAvailability } from "./day-price";

export interface TripCalendarInput {
  availability: DayAvailability;
  options: readonly { id: string; adult: number | null }[];
  currency: string | null;
  /** Aviso mínimo del viaje en horas (`Trip.minNoticeHours`). */
  minNoticeHours?: number | null;
}

/** El calendario del viaje vive tras su bandera; apagada, la ficha queda como hoy. Solo "true" enciende. */
// REQ-10863
export function isTripCalendarEnabled(value: string | undefined): boolean {
  return value === "true";
}

/**
 * Ventana de `months` meses desde el mes de hoy con el precio final más bajo de cada día (temporada + recargos,
 * G2), los días que no salen deshabilitados, los «por confirmar» ofrecidos sin precio (G3) y nada fuera de
 * vigencia (G4). `null` si en toda la ventana no hay un solo día que se ofrezca (la ficha no pinta una fachada).
 */
// REQ-10863
export function tripCalendar(trip: TripCalendarInput, opts: { today: string; months: number }): ProviderCalendar | null {
  const viaje = { availability: trip.availability, options: trip.options, currency: trip.currency };
  return buildCalendar((month) => fromTripAvailability(viaje, month), {
    today: opts.today,
    months: opts.months,
    minDays: minAdvanceDays(trip.minNoticeHours),
    currency: trip.currency,
  });
}
