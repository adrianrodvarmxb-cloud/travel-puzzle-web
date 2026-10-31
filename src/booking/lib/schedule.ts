/**
 * Cuándo toca cada correo automático de una reserva. Función pura.
 *
 * - reminder48: entre 48 h y 24 h antes del tour.
 * - dayOf: el día del tour a las 7:00 hora local; si el tour empieza antes de las 9:00,
 *   la noche anterior a las 19:00. Hasta que empieza el tour.
 * - review: 1 h después de que termina el tour, durante 2 días.
 * Un correo que no se mandó en su ventana ya no se manda (mejor nada que tarde).
 */
export type AutoEmail = "reminder48" | "dayOf" | "review";

const H = 3_600_000;

/** "2026-10-31 08:00:00" → milisegundos tomando la hora tal cual (sin zona). */
function parseNaive(value: string | null): number | null {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value) : null;
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
}

/** "2:30" → 150 min; 120 si no se entiende. */
export function durationMinutes(duration: string | null | undefined): number {
  const m = duration ? /^(\d{1,2}):(\d{2})/.exec(duration.trim()) : null;
  const min = m ? +m[1] * 60 + +m[2] : 0;
  return min > 0 ? min : 120;
}

export function dueEmails(
  b: { eventDate: string | null; eventUtcDate: string | null },
  now: Date,
  duration?: string | null
): AutoEmail[] {
  const local = parseNaive(b.eventDate);
  const start = parseNaive(b.eventUtcDate); // instante real (UTC)
  if (local === null || start === null) return [];
  const offset = local - start; // hora local = UTC + offset
  const t = now.getTime();
  const due: AutoEmail[] = [];

  if (t >= start - 48 * H && t < start - 24 * H) due.push("reminder48");

  const localDay = new Date(local);
  const day = Date.UTC(localDay.getUTCFullYear(), localDay.getUTCMonth(), localDay.getUTCDate());
  const earlyTour = localDay.getUTCHours() < 9;
  const sendLocal = earlyTour ? day - 5 * H /* 19:00 del día anterior */ : day + 7 * H;
  const sendAt = sendLocal - offset;
  if (t >= sendAt && t < start) due.push("dayOf");

  const end = start + durationMinutes(duration) * 60_000;
  if (t >= end + H && t < end + 48 * H) due.push("review");

  return due;
}
