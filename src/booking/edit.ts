import type { BookingRecord } from "./lib/booking-record";
import { loadManageView, type ManageDeps } from "./manage";
import { planEdit, type EditEvent, type Party } from "./lib/edit-plan";

/**
 * Modificar la reserva desde /reserva/{token}/modificar: otra fecha u horario del mismo tour
 * o cambiar personas. Detrás de EDIT_ENABLED y de canBeEdited de Freetour.
 */
export interface EditDeps extends ManageDeps {
  enabled: boolean;
  /** Eventos del tour (GET /tours/{id}/events). */
  tourEvents(tourExternalId: number): Promise<{ id: number; date: string; utcDate: string; language: string }[]>;
  /** GET /event/{id}/{refNumber}: lugares considerando esta reserva. */
  getEventForEdit(eventId: number, refNumber: string): Promise<EditEvent>;
  /** POST /booking/edit vía pasarela. */
  edit(p: { refNumber: string; eventId: number; adults: number; children: number }): Promise<unknown>;
  update(refNumber: string, data: Pick<BookingRecord, "eventId" | "adults" | "children" | "eventDate" | "eventUtcDate" | "language">): Promise<void>;
  notify(record: BookingRecord): Promise<unknown>;
}

export type EditResult = "disabled" | "not_found" | "not_allowed" | "no_change" | "other_tour" | "no_availability" | "min_adults" | "invalid" | "error" | "modified";

export async function editByToken(token: string, target: Party, d: EditDeps): Promise<EditResult> {
  if (!d.enabled) return "disabled";
  const view = await loadManageView(token, d);
  if (!view) return "not_found";
  if (!view.canEdit || !view.record.tourExternalId) return "not_allowed";
  const { record } = view;
  try {
    const events = await d.tourEvents(record.tourExternalId!);
    const event = await d.getEventForEdit(target.eventId, record.refNumber);
    const plan = planEdit({
      current: { eventId: record.eventId, adults: record.adults, children: record.children },
      target,
      event,
      tourEventIds: events.map((e) => e.id),
    });
    if (!plan.ok) return plan.code;
    await d.edit({ refNumber: record.refNumber, ...target });
    const info = events.find((e) => e.id === target.eventId);
    const data = {
      eventId: target.eventId,
      adults: target.adults,
      children: target.children,
      eventDate: info?.date ?? record.eventDate,
      eventUtcDate: info?.utcDate ?? record.eventUtcDate,
      language: info?.language ?? record.language,
    };
    await d.update(record.refNumber, data);
    await d.notify({ ...record, ...data });
    return "modified";
  } catch (error) {
    console.error(`[reserva] no se pudo modificar ${record.refNumber}:`, (error as Error).message);
    return "error";
  }
}
