import { isFreeBooking } from "./lib/free-booking";
import type { BookingRecord } from "./lib/booking-record";
import { cancelFailureAction } from "./lib/cancel-fallback";

/**
 * Página privada de la reserva (/reserva/{token}): ver y cancelar.
 * Freetour pide consultar GET /booking/{refNumber} antes de mostrar la cancelación,
 * para saber si todavía se permite (canBeCanceled).
 */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export interface ManageDeps {
  findByToken(token: string): Promise<BookingRecord | null>;
  /** GET /booking/{ref} vía pasarela; null si no se pudo consultar. */
  getRemote(refNumber: string): Promise<{ status: string; canBeCanceled: number; canBeEdited: number } | null>;
  setStatus(refNumber: string, status: string): Promise<void>;
}

export interface ManageView {
  record: BookingRecord;
  status: string;
  canCancel: boolean;
  /** Freetour permite modificarla (canBeEdited). */
  canEdit: boolean;
  /** No se pudo consultar a Freetour: se muestra la reserva sin acciones. */
  offline: boolean;
}

export async function loadManageView(token: string, d: ManageDeps): Promise<ManageView | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const record = await d.findByToken(token);
  if (!record) return null;
  const remote = await d.getRemote(record.refNumber).catch(() => null);
  if (!remote) return { record, status: record.status, canCancel: false, canEdit: false, offline: true };
  // REQ-017: cancelación ya solicitada al equipo; mientras Freetour la siga viendo activa, no se ofrece de nuevo.
  if (record.status === "cancel_requested" && remote.status === "active") {
    return { record, status: record.status, canCancel: false, canEdit: false, offline: false };
  }
  if (remote.status && remote.status !== record.status) {
    await d.setStatus(record.refNumber, remote.status);
  }
  const status = remote.status || record.status;
  return {
    record: { ...record, status },
    status,
    canCancel: status === "active" && !!remote.canBeCanceled,
    // REQ-066 (D9): editar solo en reservas gratis, aunque Freetour diga canBeEdited.
    canEdit: status === "active" && !!remote.canBeEdited && isFreeBooking(record as { price?: number | null; fullPrice?: number | null }),
    offline: false,
  };
}

export type CancelResult = "not_found" | "not_allowed" | "already" | "canceled" | "error" | "requested";

export async function cancelByToken(
  token: string,
  d: ManageDeps & {
    cancel(ref: { refNumber: string; eventId: number; adults: number; children: number }): Promise<unknown>;
    notify(record: BookingRecord): Promise<unknown>;
    /** REQ-017: si Freetour no acepta la cancelación, la solicitud pasa al equipo (correo interno). */
    requestManual?(record: BookingRecord): Promise<unknown>;
  }
): Promise<CancelResult> {
  const view = await loadManageView(token, d);
  if (!view) return "not_found";
  if (view.status === "canceled") return "already";
  if (!view.canCancel) return "not_allowed";
  const { record } = view;
  try {
    await d.cancel({ refNumber: record.refNumber, eventId: record.eventId, adults: record.adults, children: record.children });
  } catch (e) {
    if (!d.requestManual) return "error";
    // REQ-017: modo 2 exige que el cliente siempre pueda cancelar con nosotros.
    const action = cancelFailureAction(e as { status?: number; errorCode?: number | null });
    if (action === "too_late") return "not_allowed";
    if (action === "already") return "already";
    await d.requestManual(record);
    await d.setStatus(record.refNumber, "cancel_requested");
    return "requested";
  }
  await d.setStatus(record.refNumber, "canceled");
  await d.notify({ ...record, status: "canceled" });
  return "canceled";
}
