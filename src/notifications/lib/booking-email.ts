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
  /** Logo animado (URL pública del sitio). */
  logoUrl: string;
  /** Google Maps al punto de encuentro, si hay coordenadas. */
  mapsUrl: string | null;
  /** Foto principal del tour (catálogo de Freetour). */
  heroImageUrl?: string | null;
  /** Hasta 2 fotos más del tour. */
  galleryUrls?: string[];
  /** Hasta 2 reseñas reales (4–5 estrellas) de este tour. */
  reviews?: { name: string; rate: number; text: string }[];
  /** Free tour (recordar la propina). */
  isFree?: boolean;
  /** Canales de Travel Puzzle; cada uno aparece solo si está configurado. */
  contact?: {
    /** Número de WhatsApp en formato internacional, solo dígitos (52155...). */
    whatsapp?: string;
    socials?: { name: string; url: string }[];
    /** Página del asistente de IA (solo cuando ya exista). */
    assistantUrl?: string;
  };
}

/** Colores del Manual de Marca Travel Puzzle. */
export const BRAND = { lightBlue: "#008DFF", darkBlue: "#304A9F", yellow: "#EAF54F", red: "#C12909", ink: "#1F2A44", muted: "#6B7280", bg: "#EEF4FF" };

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
    maps: "Cómo llegar",
    hero: "¡Tu lugar está apartado!",
    badge: "Reserva confirmada",
    when: "Cuándo", who: "Quiénes", lang: "Idioma",
    reviewsTitle: "Lo que dicen otros viajeros de este tour",
    tipsTitle: "Antes de tu tour",
    tips: (free: boolean) => ["Llega 10 minutos antes al punto de encuentro.", "Guarda este correo: aquí está tu número de reserva y tu enlace.", ...(free ? ["Es un free tour: al final, deja la propina que consideres justa para tu guía."] : [])],
    slogan: "Armamos tu viaje",
    manageNote: "Si no puedes asistir, cancela desde este enlace para liberar el lugar. Guárdalo: es privado.",
    people_: (a: number, c: number) => [`${a} ${a === 1 ? "adulto" : "adultos"}`, c ? `${c} ${c === 1 ? "niño" : "niños"}` : ""].filter(Boolean).join(", "),
    locale: "es-MX",
    footer: "Travel Puzzle México · travelpuzzle.com.mx",
    help: "¿Dudas? Estamos para ayudarte",
    whatsapp: "Escríbenos por WhatsApp",
    waText: (ref: string) => `Hola Travel Puzzle, tengo la reserva ${ref} y tengo una duda.`,
    assistant: "Pregúntale a nuestro asistente",
    follow: "Síguenos",
  },
  en: {
    subject: (t: string) => `Your booking is confirmed – ${t}`,
    hello: (n: string) => `Hi ${n},`,
    intro: "Your spot is booked. Here are the details:",
    ref: "Booking number", tour: "Tour", provider: "Organized by", date: "Date and time", duration: "Duration",
    language: "Tour language", people: "People", meeting: "Meeting point",
    manage: "View, change or cancel my booking",
    maps: "Get directions",
    hero: "Your spot is booked!",
    badge: "Booking confirmed",
    when: "When", who: "Who", lang: "Language",
    reviewsTitle: "What other travelers say about this tour",
    tipsTitle: "Before your tour",
    tips: (free: boolean) => ["Arrive 10 minutes early at the meeting point.", "Keep this email: it has your booking number and private link.", ...(free ? ["It's a free tour: at the end, tip your guide what you think is fair."] : [])],
    slogan: "Armamos tu viaje",
    manageNote: "If you can't make it, please cancel from this link to free up the spot. Keep it safe: it's private.",
    people_: (a: number, c: number) => [`${a} ${a === 1 ? "adult" : "adults"}`, c ? `${c} ${c === 1 ? "child" : "children"}` : ""].filter(Boolean).join(", "),
    locale: "en-US",
    footer: "Travel Puzzle México · travelpuzzle.com.mx",
    help: "Questions? We're here to help",
    whatsapp: "Message us on WhatsApp",
    waText: (ref: string) => `Hi Travel Puzzle, I have booking ${ref} and a question.`,
    assistant: "Ask our assistant",
    follow: "Follow us",
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

/** Enlace de Google Maps al punto de encuentro (coordenadas "lat,lng" y, si hay, el lugar de Google). */
export function mapsUrlFor(mp: unknown): string | null {
  const o = (mp ?? {}) as { coordinates?: unknown; googlePlaceId?: unknown };
  if (typeof o.coordinates !== "string" || !/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(o.coordinates.trim())) return null;
  const q = new URLSearchParams({ api: "1", query: o.coordinates.replace(/\s/g, "") });
  if (typeof o.googlePlaceId === "string" && o.googlePlaceId) q.set("query_place_id", o.googlePlaceId);
  return `https://www.google.com/maps/search/?${q.toString()}`;
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
  const B = BRAND;
  const when = d.eventDate ? formatEventDate(d.eventDate, d.lang) : null;
  const people = t.people_(d.adults, d.children);
  const tourLang = d.tourLanguage ? (LANG_NAMES[d.lang][d.tourLanguage] ?? d.tourLanguage) : null;
  const gallery = (d.galleryUrls ?? []).slice(0, 2);
  const reviews = (d.reviews ?? []).slice(0, 2);
  const stars = (r: number) => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
  const font = "Poppins,Arial,Helvetica,sans-serif";
  const wa = d.contact?.whatsapp?.replace(/\D/g, "");
  const waUrl = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(t.waText(d.refNumber))}` : null;
  const socials = (d.contact?.socials ?? []).filter((x) => /^https:\/\//.test(x.url));
  const assistantUrl = d.contact?.assistantUrl && /^https:\/\//.test(d.contact.assistantUrl) ? d.contact.assistantUrl : null;

  const rows: [string, string][] = [
    [t.ref, d.refNumber],
    [t.tour, d.tourTitle],
    ...(d.provider ? [[t.provider, d.provider] as [string, string]] : []),
    ...(when ? [[t.date, when] as [string, string]] : []),
    ...(d.duration ? [[t.duration, d.duration] as [string, string]] : []),
    ...(tourLang ? [[t.language, tourLang] as [string, string]] : []),
    [t.people, people],
    ...(d.meetingPoint ? [[t.meeting, d.meetingPoint] as [string, string]] : []),
  ];
  const subject = t.subject(d.tourTitle);

  const cell = (label: string, value: string) =>
    `<td valign="top" style="padding:10px 12px;width:33%"><div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${B.muted}">${esc(label)}</div><div style="font-size:15px;font-weight:600;color:${B.darkBlue};margin-top:2px">${esc(value)}</div></td>`;

  const html = `<!doctype html><html lang="${d.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Caveat:wght@600&display=swap" rel="stylesheet">
<title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${B.bg};font-family:${font};color:${B.ink}">
<div style="display:none;max-height:0;overflow:hidden">${esc(t.badge)} · ${esc(d.tourTitle)} · ${esc(d.refNumber)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${B.bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">

<tr><td align="center" style="padding:20px 24px 12px"><img src="${esc(d.logoUrl)}" width="150" alt="Travel Puzzle" style="display:block;width:150px;max-width:50%;height:auto;border:0"></td></tr>

${d.heroImageUrl ? `<tr><td><img src="${esc(d.heroImageUrl)}" width="600" alt="${esc(d.tourTitle)}" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>` : ""}

<tr><td style="background:${B.darkBlue};padding:26px 28px">
<span style="display:inline-block;background:${B.yellow};color:${B.darkBlue};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:6px 12px;border-radius:999px">✓ ${esc(t.badge)}</span>
<h1 style="margin:14px 0 6px;font-size:28px;line-height:1.2;color:#ffffff;font-weight:700">${esc(t.hero)}</h1>
<p style="margin:0;font-size:16px;color:#DCE6FF">${esc(t.hello(d.firstName))} ${esc(d.tourTitle)}</p>
</td></tr>

<tr><td style="padding:24px 24px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px dashed ${B.lightBlue};border-radius:14px">
<tr><td colspan="3" style="padding:14px 12px 4px"><div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${B.muted}">${esc(t.ref)}</div>
<div style="font-size:22px;font-weight:700;color:${B.darkBlue};font-family:'Courier New',monospace;letter-spacing:1px">${esc(d.refNumber)}</div></td></tr>
<tr>${cell(t.when, when ?? "—")}${cell(t.who, people)}${cell(t.lang, tourLang ?? "—")}</tr>
</table>
</td></tr>

<tr><td style="padding:8px 24px">
<table role="presentation" width="100%" cellpadding="6" cellspacing="0" style="font-size:14px">
${rows.filter(([k]) => k !== t.ref).map(([k, v]) => `<tr><td style="color:${B.muted};width:38%;vertical-align:top">${esc(k)}</td><td style="font-weight:600;color:${B.ink}">${esc(v)}</td></tr>`).join("\n")}
</table>
</td></tr>

<tr><td align="center" style="padding:16px 24px 8px">
<a href="${esc(d.manageUrl)}" style="display:inline-block;background:${B.yellow};color:${B.darkBlue};text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:999px">${esc(t.manage)}</a>
${d.mapsUrl ? `<div style="margin-top:12px"><a href="${esc(d.mapsUrl)}" style="display:inline-block;border:2px solid ${B.lightBlue};color:${B.lightBlue};text-decoration:none;font-weight:600;font-size:15px;padding:10px 22px;border-radius:999px">📍 ${esc(t.maps)}</a></div>` : ""}
<p style="margin:12px 0 0;font-size:12px;color:${B.muted}">${esc(t.manageNote)}</p>
</td></tr>

${gallery.length ? `<tr><td style="padding:16px 18px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${gallery.map((u) => `<td style="padding:0 6px" width="${Math.floor(100 / gallery.length)}%"><img src="${esc(u)}" alt="${esc(d.tourTitle)}" width="270" style="display:block;width:100%;height:auto;border-radius:12px;border:0"></td>`).join("")}</tr></table></td></tr>` : ""}

${reviews.length ? `<tr><td style="padding:24px 24px 0">
<h2 style="margin:0 0 12px;font-size:18px;color:${B.darkBlue}">${esc(t.reviewsTitle)}</h2>
${reviews.map((r) => `<div style="background:${B.bg};border-left:4px solid ${B.lightBlue};border-radius:10px;padding:12px 14px;margin-bottom:10px">
<div style="color:#F5A524;font-size:15px;letter-spacing:1px">${stars(r.rate)}</div>
<div style="font-size:14px;color:${B.ink};margin:4px 0">“${esc(r.text)}”</div>
<div style="font-size:12px;color:${B.muted}">— ${esc(r.name)}</div></div>`).join("\n")}
</td></tr>` : ""}

<tr><td style="padding:20px 24px 28px">
<h2 style="margin:0 0 8px;font-size:18px;color:${B.darkBlue}">${esc(t.tipsTitle)}</h2>
<ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.6;color:${B.ink}">${t.tips(!!d.isFree).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
</td></tr>

${waUrl || assistantUrl ? `<tr><td align="center" style="padding:0 24px 28px">
<div style="background:${B.bg};border-radius:14px;padding:18px 16px">
<div style="font-size:16px;font-weight:700;color:${B.darkBlue};margin-bottom:12px">${esc(t.help)}</div>
${waUrl ? `<a href="${esc(waUrl)}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:999px;margin:4px">💬 ${esc(t.whatsapp)}</a>` : ""}
${assistantUrl ? `<a href="${esc(assistantUrl)}" style="display:inline-block;background:${B.lightBlue};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:999px;margin:4px">✨ ${esc(t.assistant)}</a>` : ""}
</div></td></tr>` : ""}

<tr><td align="center" style="background:${B.darkBlue};padding:22px 24px">
${socials.length ? `<div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#DCE6FF;margin-bottom:8px">${esc(t.follow)}</div>
<div style="margin-bottom:14px">${socials.map((x) => `<a href="${esc(x.url)}" style="display:inline-block;color:${B.darkBlue};background:${B.yellow};text-decoration:none;font-size:13px;font-weight:600;padding:6px 12px;border-radius:999px;margin:3px">${esc(x.name)}</a>`).join("")}</div>` : ""}
<div style="font-family:Caveat,'Comic Sans MS',cursive;font-size:26px;color:${B.yellow}">${esc(t.slogan)}</div>
<div style="font-size:12px;color:#DCE6FF;margin-top:6px">${esc(t.footer)}</div>
</td></tr>

</table></td></tr></table></body></html>`;

  const text = [
    t.hero,
    "",
    t.hello(d.firstName),
    t.intro,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(d.mapsUrl ? [`${t.maps}: ${d.mapsUrl}`] : []),
    "",
    `${t.manage}: ${d.manageUrl}`,
    t.manageNote,
    ...(reviews.length ? ["", t.reviewsTitle, ...reviews.map((r) => `${stars(r.rate)} "${r.text}" — ${r.name}`)] : []),
    "",
    t.tipsTitle,
    ...t.tips(!!d.isFree).map((x) => `- ${x}`),
    ...(waUrl ? ["", `${t.whatsapp}: ${waUrl}`] : []),
    ...(assistantUrl ? [`${t.assistant}: ${assistantUrl}`] : []),
    ...(socials.length ? ["", `${t.follow}: ${socials.map((x) => `${x.name} ${x.url}`).join(" · ")}`] : []),
    "",
    `${t.slogan} · ${t.footer}`,
  ].join("\n");

  return { subject, html, text };
}
