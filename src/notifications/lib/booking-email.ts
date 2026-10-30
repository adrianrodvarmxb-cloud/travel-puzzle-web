/**
 * Correo de confirmación de reserva (Modo 2 de Freetour): tour, proveedor,
 * fecha, duración, idioma, personas, número de reserva, punto de encuentro y
 * enlace para cancelar o cambiar. Función pura.
 */
export type EmailLang = "es" | "en";

export interface BookingEmailData {
  lang: EmailLang;
  refNumber: string;
  firstName: string;
  tourTitle: string;
  provider: string | null;
  eventDate: string | null; // "2026-10-31 08:00:00", hora local del tour
  duration: string | null;
  tourLanguage: string | null;
  adults: number;
  children: number;
  meetingPoint: string | null;
  manageUrl: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const LANG_NAMES: Record<EmailLang, Record<string, string>> = {
  es: { Spanish: "Español", English: "Inglés", French: "Francés", German: "Alemán", Italian: "Italiano", Portuguese: "Portugués" },
  en: {},
};

const T = {
  es: {
    subject: (t: string) => `Tu reserva está confirmada – ${t}`,
    hello: (n: string) => `Hola ${n}:`,
    intro: "Tu lugar está reservado. Estos son los detalles:",
    ref: "Número de reserva", tour: "Tour", provider: "Organiza", date: "Fecha y hora", duration: "Duración",
    language: "Idioma del tour", people: "Personas", meeting: "Punto de encuentro",
    manage: "Ver, cambiar o cancelar mi reserva",
    manageNote: "Si no puedes asistir, cancela desde este enlace para liberar el lugar. Guárdalo: es privado.",
    people_: (a: number, c: number) => [`${a} ${a === 1 ? "adulto" : "adultos"}`, c ? `${c} ${c === 1 ? "niño" : "niños"}` : ""].filter(Boolean).join(", "),
    locale: "es-MX",
    footer: "Travel Puzzle México · travelpuzzle.com.mx",
  },
  en: {
    subject: (t: string) => `Your booking is confirmed – ${t}`,
    hello: (n: string) => `Hi ${n},`,
    intro: "Your spot is booked. Here are the details:",
    ref: "Booking number", tour: "Tour", provider: "Organized by", date: "Date and time", duration: "Duration",
    language: "Tour language", people: "People", meeting: "Meeting point",
    manage: "View, change or cancel my booking",
    manageNote: "If you can't make it, please cancel from this link to free up the spot. Keep it safe: it's private.",
    people_: (a: number, c: number) => [`${a} ${a === 1 ? "adult" : "adults"}`, c ? `${c} ${c === 1 ? "child" : "children"}` : ""].filter(Boolean).join(", "),
    locale: "en-US",
    footer: "Travel Puzzle México · travelpuzzle.com.mx",
  },
};

/** "2026-10-31 08:00:00" → "31 de octubre de 2026, 08:00" (sin cambiar de zona horaria). */
function formatEventDate(value: string, lang: EmailLang): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  if (!m) return value;
  const [, y, mo, d, h, mi] = m;
  const date = new Date(Date.UTC(+y, +mo - 1, +d));
  const day = date.toLocaleDateString(T[lang].locale, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  return `${day}, ${h}:${mi}`;
}

/** El punto de encuentro de Freetour llega como texto o por idioma. */
export function meetingPointText(mp: unknown, lang: EmailLang): string | null {
  if (!mp) return null;
  if (typeof mp === "string") return mp;
  const o = mp as Record<string, unknown>;
  const title = o.title ?? o;
  if (typeof title === "string") return title;
  const byLang = title as Record<string, unknown>;
  const v = byLang[lang] ?? byLang.en ?? byLang.es;
  return typeof v === "string" && v.trim() ? v : null;
}

export function buildBookingConfirmationEmail(d: BookingEmailData) {
  const t = T[d.lang];
  const rows: [string, string][] = [
    [t.ref, d.refNumber],
    [t.tour, d.tourTitle],
    ...(d.provider ? [[t.provider, d.provider] as [string, string]] : []),
    ...(d.eventDate ? [[t.date, formatEventDate(d.eventDate, d.lang)] as [string, string]] : []),
    ...(d.duration ? [[t.duration, d.duration] as [string, string]] : []),
    ...(d.tourLanguage ? [[t.language, LANG_NAMES[d.lang][d.tourLanguage] ?? d.tourLanguage] as [string, string]] : []),
    [t.people, t.people_(d.adults, d.children)],
    ...(d.meetingPoint ? [[t.meeting, d.meetingPoint] as [string, string]] : []),
  ];

  const subject = t.subject(d.tourTitle);

  const html = `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#2563eb;color:#ffffff;padding:20px 24px;font-size:20px;font-weight:bold">Travel Puzzle</td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 8px">${esc(t.hello(d.firstName))}</p>
<p style="margin:0 0 16px">${esc(t.intro)}</p>
<table role="presentation" width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">
${rows.map(([k, v]) => `<tr><td style="color:#6b7280;width:40%;vertical-align:top">${esc(k)}</td><td style="font-weight:bold">${esc(v)}</td></tr>`).join("\n")}
</table>
<p style="margin:24px 0 8px"><a href="${esc(d.manageUrl)}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${esc(t.manage)}</a></p>
<p style="margin:0;font-size:13px;color:#6b7280">${esc(t.manageNote)}</p>
</td></tr>
<tr><td style="padding:16px 24px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb">${esc(t.footer)}</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    t.hello(d.firstName),
    "",
    t.intro,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `${t.manage}: ${d.manageUrl}`,
    t.manageNote,
    "",
    t.footer,
  ].join("\n");

  return { subject, html, text };
}
