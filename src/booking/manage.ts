import type { BookingRecord } from "./lib/booking-record";

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
  /** No se pudo consultar a Freetour: se muestra la reserva sin acciones. */
  offline: boolean;
}

export async function loadManageView(token: string, d: ManageDeps): Promise<ManageView | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const record = await d.findByToken(token);
  if (!record) return null;
  const remote = await d.getRemote(record.refNumber).catch(() => null);
  if (!remote) return { record, status: record.status, canCancel: false, offline: true };
  if (remote.status && remote.status !== record.status) {
    await d.setStatus(record.refNumber, remote.status);
  }
  const status = remote.status || record.status;
  return { record: { ...record, status }, status, canCancel: status === "active" && !!remote.canBeCanceled, offline: false };
}

export type CancelResult = "not_found" | "not_allowed" | "already" | "canceled" | "error";

export async function cancelByToken(
  token: string,
  d: ManageDeps & {
    cancel(ref: { refNumber: string; eventId: number; adults: number; children: number }): Promise<unknown>;
    notify(record: BookingRecord): Promise<unknown>;
  }
): Promise<CancelResult> {
  const view = await loadManageView(token, d);
  if (!view) return "not_found";
  if (view.status === "canceled") return "already";
  if (!view.canCancel) return "not_allowed";
  const { record } = view;
  try {
    await d.cancel({ refNumber: record.refNumber, eventId: record.eventId, adults: record.adults, children: record.children });
  } catch {
    return "error";
  }
  await d.setStatus(record.refNumber, "canceled");
  await d.notify({ ...record, status: "canceled" });
  return "canceled";
}
