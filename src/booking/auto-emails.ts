import type { BookingRecord } from "./lib/booking-record";
import { dueEmails, type AutoEmail } from "./lib/schedule";

/**
 * Correos automáticos por reserva: recordatorio 48 h, recordatorio del día y reseña post-tour.
 * Lo llama el cron cada 5 minutos. Cada correo se manda una sola vez y solo dentro de su ventana.
 * Antes de un recordatorio se confirma con Freetour que la reserva sigue activa.
 */
const MAX_SENDS_PER_RUN = 20;
const H = 3_600_000;

/** Date → "YYYY-MM-DD HH:MM:SS" (UTC), el formato en que se guarda eventUtcDate. */
export function toUtcText(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export interface AutoEmailDeps {
  now: Date;
  reviewsEnabled: boolean;
  listCandidates(fromUtc: string, toUtc: string): Promise<BookingRecord[]>;
  sentKinds(refNumbers: string[]): Promise<Set<string>>;
  markSent(refNumber: string, kind: AutoEmail): Promise<void>;
  /** Estado en Freetour; null si no se pudo consultar (se reintenta en la siguiente vuelta). */
  freetourStatus(refNumber: string): Promise<string | null>;
  setStatus(refNumber: string, status: string): Promise<void>;
  getDuration(tourExternalId: number | null): Promise<string | null>;
  send(kind: AutoEmail, record: BookingRecord): Promise<"disabled" | "sent" | "failed">;
}

export async function runAutoEmails(d: AutoEmailDeps) {
  const summary = { checked: 0, sent: 0, failed: 0, skipped: 0, closed: 0 };
  const t = d.now.getTime();
  const candidates = await d.listCandidates(toUtcText(new Date(t - 3 * 24 * H)), toUtcText(new Date(t + 49 * H)));
  const sent = await d.sentKinds(candidates.map((c) => c.refNumber));

  for (const record of candidates) {
    if (summary.sent + summary.failed >= MAX_SENDS_PER_RUN) break;
    summary.checked++;
    const duration = await d.getDuration(record.tourExternalId).catch(() => null);
    const due = dueEmails(record, d.now, duration).filter((k) => !sent.has(`${record.refNumber}|${k}`));
    for (const kind of due) {
      if (kind === "review" && !d.reviewsEnabled) { summary.skipped++; continue; }
      if (kind !== "review") {
        const status = await d.freetourStatus(record.refNumber).catch(() => null);
        if (status === null) { summary.skipped++; continue; }
        if (status !== "active") {
          await d.setStatus(record.refNumber, status);
          summary.closed++;
          break;
        }
      }
      const result = await d.send(kind, record);
      if (result === "sent") {
        await d.markSent(record.refNumber, kind);
        summary.sent++;
      } else if (result === "failed") summary.failed++;
      else summary.skipped++;
    }
  }
  return summary;
}
