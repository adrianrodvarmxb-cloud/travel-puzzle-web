/**
 * Invitación de calendario (.ics) que Gmail, Outlook y Apple agregan solos a la agenda.
 * El UID es fijo por reserva: al reenviar con SEQUENCE mayor el evento se mueve,
 * y con METHOD:CANCEL se borra. Horas en UTC (exactas, sin depender de la zona).
 */
export interface IcsEvent {
  method: "REQUEST" | "CANCEL";
  refNumber: string;
  /** Inicio real del tour en UTC: "2026-11-02 16:00:00". */
  startUtc: string;
  durationMinutes: number;
  title: string;
  location?: string | null;
  description: string;
  url?: string | null;
  organizerEmail: string;
  attendeeEmail: string;
  attendeeName: string;
  /** Marca de tiempo (ms) para DTSTAMP y SEQUENCE; debe crecer en cada envío. */
  now: number;
}

/** Escapa texto según RFC 5545. */
function txt(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Corta líneas a 75 octetos (RFC 5545 §3.1). */
function fold(line: string): string {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length;
    if (bytes + b > 74) {
      out.push(cur);
      cur = " " + ch;
      bytes = 1 + b;
    } else {
      cur += ch;
      bytes += b;
    }
  }
  out.push(cur);
  return out.join("\r\n");
}

const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function buildIcs(e: IcsEvent): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(e.startUtc);
  if (!m) return null;
  const start = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const end = start + e.durationMinutes * 60_000;
  const cancel = e.method === "CANCEL";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Travel Puzzle//Reservas//ES",
    "CALSCALE:GREGORIAN",
    `METHOD:${e.method}`,
    "BEGIN:VEVENT",
    `UID:${e.refNumber}@travelpuzzle.com.mx`,
    `SEQUENCE:${Math.floor(e.now / 1000)}`,
    `DTSTAMP:${stamp(e.now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${txt(e.title)}`,
    ...(e.location ? [`LOCATION:${txt(e.location)}`] : []),
    `DESCRIPTION:${txt(e.description)}`,
    ...(e.url ? [`URL:${e.url}`] : []),
    `ORGANIZER;CN=Travel Puzzle:mailto:${e.organizerEmail}`,
    `ATTENDEE;CN=${txt(e.attendeeName)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${e.attendeeEmail}`,
    `STATUS:${cancel ? "CANCELLED" : "CONFIRMED"}`,
    "TRANSP:OPAQUE",
    ...(cancel
      ? []
      : ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${txt(e.title)}`, "TRIGGER:-PT2H", "END:VALARM"]),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Adjunto listo para Resend (contenido en base64). */
export function icsAttachment(ics: string, method: "REQUEST" | "CANCEL") {
  const bytes = new TextEncoder().encode(ics);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return { filename: method === "CANCEL" ? "cancelacion.ics" : "invitacion.ics", content: btoa(bin), contentType: `text/calendar; charset=utf-8; method=${method}` };
}
