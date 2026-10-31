import type { BookingRecord } from "./lib/booking-record";

/**
 * Aviso de Freetour cuando un organizador rechaza una reserva
 * (POST { refNumber, reason } a nuestra URL; requisito del Modo 2).
 *
 * No hay firma en el aviso, así que antes de actuar se confirma con Freetour
 * (GET /booking/{refNumber} vía la pasarela) que de verdad está "rejected".
 * Un aviso falso no puede hacer nada: solo reenvía el correo de una reserva
 * que ya está rechazada, y una sola vez.
 */
export type RejectionResult = "invalid" | "unknown" | "not_rejected" | "already" | "processed";

export const REF_PATTERN = /^\d{1,9}-\d{14}-\d{1,6}$/;

interface Deps {
  findByRef(refNumber: string): Promise<BookingRecord | null>;
  /** Estado actual en Freetour, o null si no se pudo consultar. */
  freetourStatus(refNumber: string): Promise<string | null>;
  setStatus(refNumber: string, status: string): Promise<void>;
  notify(record: BookingRecord, reason: string | null): Promise<unknown>;
}

export async function handleRejection(body: unknown, deps: Deps): Promise<RejectionResult> {
  const b = (body ?? {}) as { refNumber?: unknown; reason?: unknown };
  const refNumber = typeof b.refNumber === "string" ? b.refNumber.trim() : "";
  if (!REF_PATTERN.test(refNumber)) return "invalid";
  const reason = typeof b.reason === "string" && b.reason.trim() ? b.reason.trim().slice(0, 400) : null;

  const record = await deps.findByRef(refNumber);
  if (!record) return "unknown";
  if (record.status === "rejected") return "already";

  const status = await deps.freetourStatus(refNumber);
  if (status !== "rejected") return "not_rejected";

  await deps.setStatus(refNumber, "rejected");
  await deps.notify({ ...record, status: "rejected" }, reason);
  return "processed";
}
