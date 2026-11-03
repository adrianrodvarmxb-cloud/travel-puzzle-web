/** Reglas para modificar una reserva (otra fecha/horario del mismo tour o cambiar personas). Pura. */

/** Evento para edición: GET /event/{id}/{refNumber} (los lugares ya consideran la reserva actual). */
export interface EditEvent {
  id: number;
  isAvailable: number | boolean;
  minAdultsPerBooking: number;
  availableAdultPlaces: number;
  availableChildrenPlaces?: number;
}

export interface Party {
  eventId: number;
  adults: number;
  children: number;
}

export type EditPlan = { ok: true } | { ok: false; code: "no_change" | "other_tour" | "no_availability" | "min_adults" | "invalid" };

export function planEdit(input: { current: Party; target: Party; event: EditEvent; tourEventIds: number[] }): EditPlan {
  const { current, target, event, tourEventIds } = input;
  if (![target.eventId, target.adults, target.children].every(Number.isInteger) || target.children < 0 || event.id !== target.eventId) {
    return { ok: false, code: "invalid" };
  }
  if (target.eventId === current.eventId && target.adults === current.adults && target.children === current.children) {
    return { ok: false, code: "no_change" };
  }
  if (!tourEventIds.includes(target.eventId)) return { ok: false, code: "other_tour" };
  if (target.adults < Math.max(1, event.minAdultsPerBooking || 1)) return { ok: false, code: "min_adults" };
  const childPlaces = event.availableChildrenPlaces ?? event.availableAdultPlaces;
  if (!event.isAvailable || target.adults > event.availableAdultPlaces || target.children > childPlaces) {
    return { ok: false, code: "no_availability" };
  }
  return { ok: true };
}
