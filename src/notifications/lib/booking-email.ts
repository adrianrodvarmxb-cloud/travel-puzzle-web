/**
 * Correo de confirmación de reserva (Modo 2 de Freetour): tour, proveedor,
 * fecha, duración, idioma, personas, número de reserva, punto de encuentro y
 * enlace para cancelar o cambiar. Función pura.
 */
import type { Weather, WeatherKind } from "@/notifications/weather";

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
  /** Logo fijo del encabezado (URL pública del sitio). */
  logoUrl: string;
  /** Logo animado del pie (GIF sobre azul oscuro). */
  animatedLogoUrl?: string;
  /** Pronóstico del clima para la hora del tour (MET Norway). */
  weather?: Weather | null;
  /** Carpeta pública con los íconos oficiales de redes (instagram.png, …). */
  iconsBaseUrl?: string;
  /** Momento de envío, para la cuenta regresiva ("Faltan 3 días"). */
  now?: Date;
  /** Calificación del tour en el catálogo. */
  rating?: { value: number; count: number } | null;
  /** Ciudad del tour, para "Más planes en …". */
  cityName?: string | null;
  /** Hasta 3 tours más en la misma ciudad. */
  moreTours?: { title: string; url: string; imageUrl: string; rating?: number | null; isFree?: boolean }[];
  /** Google Maps al punto de encuentro, si hay coordenadas. */
  mapsUrl: string | null;
  /** Foto principal del tour (catálogo de Freetour). */
  heroImageUrl?: string | null;
  /** Hasta 2 fotos más del tour. */
  galleryUrls?: string[];
  /** Hasta 2 reseñas reales (4–5 estrellas) de este tour. */
  reviews?: { name: string; rate: number; text: string }[];
  /** Confirmación (por defecto) o recordatorio: mismo contenido, otro encabezado. */
  variant?: "confirmation" | "reminder48" | "dayOf";
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

import { BRAND } from "./brand";
import { esc, renderShell, kit, UI, MONO } from "./email-layout";
export { BRAND };


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
    variants: {
      reminder48: { subject: (t: string) => `Tu tour es en 2 días – ${t}`, badge: "Recordatorio", hero: "¡Ya casi es tu tour!" },
      dayOf: { subject: (t: string) => `Tu tour está por empezar – ${t}`, badge: "Último recordatorio", hero: "¡Tu tour está por empezar!" },
    },
    countdown: (n: number) => (n === 0 ? "¡Es hoy!" : n === 1 ? "¡Es mañana!" : `Faltan ${n} días`),
    calendar: "Agrégalo a tu calendario",
    reviewsCount: (n: number) => `${n} ${n === 1 ? "reseña" : "reseñas"}`,
    more: (c: string | null) => (c ? `Más planes en ${c}` : "Más planes para tu viaje"),
    free: "Gratis",
    see: "Ver tour",
    myBooking: "Mi reserva", helpShort: "Ayuda",
    statusOk: "Confirmada", detailsTitle: "Detalles de tu reserva",
    secDetails: "Tu reserva", secReviews: "Reseñas", secTips: "Checklist", secHelp: "Soporte", secMore: "Explora",
    weatherTitle: "Pronóstico para tu tour",
    weatherRange: (min: number, max: number) => `Mín ${min}° · Máx ${max}°`,
    rainChance: (n: number) => `Lluvia ${n}%`,
    weatherCredit: "Pronóstico: MET Norway",
    sky: { sun: "Soleado", partly: "Parcialmente nublado", cloud: "Nublado", rain: "Lluvia", storm: "Tormenta", snow: "Nieve", fog: "Niebla" } as Record<WeatherKind, string>,
    skyTip: { sun: "Lleva bloqueador, lentes de sol y agua.", partly: "Lleva bloqueador y agua.", cloud: "Lleva un suéter ligero por si refresca.", rain: "Lleva paraguas o impermeable.", storm: "Lleva impermeable y revisa el clima antes de salir.", snow: "Abrígate bien y usa calzado cómodo.", fog: "Abrígate: por la mañana puede refrescar." } as Record<WeatherKind, string>,
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
    variants: {
      reminder48: { subject: (t: string) => `Your tour is in 2 days – ${t}`, badge: "Reminder", hero: "Your tour is almost here!" },
      dayOf: { subject: (t: string) => `Your tour is about to start – ${t}`, badge: "Final reminder", hero: "Your tour is about to start!" },
    },
    countdown: (n: number) => (n === 0 ? "It's today!" : n === 1 ? "It's tomorrow!" : `${n} days to go`),
    calendar: "Add it to your calendar",
    reviewsCount: (n: number) => `${n} ${n === 1 ? "review" : "reviews"}`,
    more: (c: string | null) => (c ? `More things to do in ${c}` : "More ideas for your trip"),
    free: "Free",
    see: "See tour",
    myBooking: "My booking", helpShort: "Help",
    statusOk: "Confirmed", detailsTitle: "Your booking details",
    secDetails: "Your booking", secReviews: "Reviews", secTips: "Checklist", secHelp: "Support", secMore: "Explore",
    weatherTitle: "Forecast for your tour",
    weatherRange: (min: number, max: number) => `Low ${min}° · High ${max}°`,
    rainChance: (n: number) => `Rain ${n}%`,
    weatherCredit: "Forecast: MET Norway",
    sky: { sun: "Sunny", partly: "Partly cloudy", cloud: "Cloudy", rain: "Rain", storm: "Thunderstorm", snow: "Snow", fog: "Fog" } as Record<WeatherKind, string>,
    skyTip: { sun: "Bring sunscreen, sunglasses and water.", partly: "Bring sunscreen and water.", cloud: "Bring a light sweater in case it gets cool.", rain: "Bring an umbrella or raincoat.", storm: "Bring a raincoat and check the weather before you go.", snow: "Dress warmly and wear comfy shoes.", fog: "Dress warmly: mornings can be chilly." } as Record<WeatherKind, string>,
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

/** Fecha, personas e idioma del tour en el idioma del correo (compartido con los demás correos). */
export function describeBooking(lang: EmailLang, b: { eventDate: string | null; adults: number; children: number; tourLanguage: string | null }) {
  return {
    when: b.eventDate ? formatEventDate(b.eventDate, lang) : null,
    people: T[lang].people_(b.adults, b.children),
    tourLang: b.tourLanguage ? (LANG_NAMES[lang][b.tourLanguage] ?? b.tourLanguage) : null,
  };
}

/** Enlace de Google Maps al punto de encuentro (coordenadas "lat,lng" y, si hay, el lugar de Google). */
export function mapsUrlFor(mp: unknown): string | null {
  const o = (mp ?? {}) as { coordinates?: unknown; googlePlaceId?: unknown };
  if (typeof o.coordinates !== "string" || !/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(o.coordinates.trim())) return null;
  const q = new URLSearchParams({ api: "1", query: o.coordinates.replace(/\s/g, "") });
  if (typeof o.googlePlaceId === "string" && o.googlePlaceId) q.set("query_place_id", o.googlePlaceId);
  return `https://www.google.com/maps/search/?${q.toString()}`;
}

/** Días que faltan del día de envío al día del tour (por fecha de calendario). null si ya pasó o no hay fecha. */
export function daysUntil(eventDate: string | null, now: Date | undefined): number | null {
  const m = eventDate && now ? /^(\d{4})-(\d{2})-(\d{2})/.exec(eventDate) : null;
  if (!m || !now) return null;
  const event = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const n = Math.round((event - today) / 86_400_000);
  return n >= 0 ? n : null;
}

/** "2:00" / "1:30" → minutos (2 h si no se entiende). */
function durationMinutes(duration: string | null): number {
  const m = duration ? /^(\d{1,2}):(\d{2})/.exec(duration.trim()) : null;
  const min = m ? +m[1] * 60 + +m[2] : 0;
  return min > 0 ? min : 120;
}

/** Enlaces para agregar el tour a Google Calendar y Outlook (hora local del tour). */
export function calendarLinks(o: { title: string; eventDate: string | null; duration: string | null; location: string | null; details: string }) {
  const m = o.eventDate ? /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(o.eventDate) : null;
  if (!m) return null;
  const start = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  const end = new Date(start.getTime() + durationMinutes(o.duration) * 60_000);
  const iso = (d: Date) => d.toISOString().slice(0, 19); // 2026-11-02T10:00:00 (sin zona: hora local)
  const compact = (d: Date) => iso(d).replace(/[-:]/g, "");
  const google = new URLSearchParams({ action: "TEMPLATE", text: o.title, dates: `${compact(start)}/${compact(end)}`, details: o.details, ...(o.location ? { location: o.location } : {}) });
  const outlook = new URLSearchParams({ path: "/calendar/action/compose", rru: "addevent", subject: o.title, startdt: iso(start), enddt: iso(end), body: o.details, ...(o.location ? { location: o.location } : {}) });
  return {
    google: `https://calendar.google.com/calendar/render?${google.toString()}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?${outlook.toString()}`,
  };
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
  const days = daysUntil(d.eventDate, d.now);
  const cal = calendarLinks({ title: d.tourTitle, eventDate: d.eventDate, duration: d.duration, location: d.meetingPoint, details: `${t.ref}: ${d.refNumber}\n${d.manageUrl}` });
  const rating = d.rating && d.rating.value > 0 && d.rating.count > 0 ? d.rating : null;
  const more = (d.moreTours ?? []).filter((x) => /^https:\/\//.test(x.imageUrl) && /^https?:\/\//.test(x.url)).slice(0, 3);
  const SKY: Record<WeatherKind, string> = { sun: "☀️", partly: "⛅", cloud: "☁️", rain: "🌧️", storm: "⛈️", snow: "❄️", fog: "🌫️" };
  const w = d.weather ?? null;

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
  const v = d.variant && d.variant !== "confirmation" ? t.variants[d.variant] : null;
  const badge = v?.badge ?? t.badge, hero = v?.hero ?? t.hero;
  const subject = v ? v.subject(d.tourTitle) : t.subject(d.tourTitle);

  const { N9, N8, LINE, SOFT, DIM } = UI;
  const mono = MONO;
  const { eyebrow, h2, ghost, passCell, primary } = kit();

  const body = `${d.heroImageUrl ? `<tr><td style="background:${N9}"><img src="${esc(d.heroImageUrl)}" width="600" alt="${esc(d.tourTitle)}" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>` : ""}

<tr><td style="background:${N9};background-image:linear-gradient(160deg,${N9} 0%,${N8} 55%,${B.darkBlue} 100%);padding:26px 26px 30px">
<div style="font-family:${mono};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7CE3A1"><span style="color:#3DDC84">●</span>&nbsp; ${esc(badge)}${days !== null ? `<span style="color:#34467F">&nbsp;&nbsp;|&nbsp;&nbsp;</span><span style="color:${B.yellow}">${esc(t.countdown(days))}</span>` : ""}</div>
<h1 style="margin:14px 0 8px;font-size:32px;line-height:1.15;color:#ffffff;font-weight:700;letter-spacing:-0.6px">${esc(hero)}</h1>
<p style="margin:0;font-size:15px;line-height:1.5;color:#C9D6F5">${esc(t.hello(d.firstName))} <span style="color:#ffffff;font-weight:600">${esc(d.tourTitle)}</span></p>
${rating ? `<p style="margin:12px 0 0;font-size:13px;color:#C9D6F5"><span style="color:${B.yellow};letter-spacing:2px">★★★★★</span>&nbsp; <span style="font-family:${mono};color:#ffffff;font-weight:700">${rating.value.toFixed(1)}</span> · ${esc(t.reviewsCount(rating.count))}</p>` : ""}
</td></tr>

<tr><td style="padding:24px 22px 6px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${N9};background-image:linear-gradient(135deg,${N9},${N8});border-radius:16px;border:1px solid #22336B">
<tr><td colspan="3" style="padding:16px 16px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font-family:${mono};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${DIM}">${esc(t.ref)}</td>
<td align="right" style="font-family:${mono};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7CE3A1">● ${esc(t.statusOk)}</td>
</tr></table>
<div style="font-family:${mono};font-size:22px;font-weight:700;color:#ffffff;letter-spacing:1.5px;margin-top:6px;word-break:break-all">${esc(d.refNumber)}</div>
</td></tr>
<tr><td colspan="3" style="padding:0 16px"><div style="border-top:1px dashed #34467F;height:0;line-height:0;font-size:0">&nbsp;</div></td></tr>
<tr>${passCell(t.when, when ?? "—")}${passCell(t.who, people)}${passCell(t.lang, tourLang ?? "—")}</tr>
</table>
</td></tr>

${w ? `<tr><td style="padding:12px 22px 6px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};border:1px solid ${LINE};border-radius:16px"><tr>
<td width="64" align="center" valign="middle" style="padding:16px 0 16px 16px;font-size:38px;line-height:1">${SKY[w.kind]}</td>
<td valign="middle" style="padding:16px">
<div style="font-family:${mono};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${B.lightBlue}">${esc(t.weatherTitle)}</div>
<div style="margin-top:4px;color:${N9}"><span style="font-size:30px;font-weight:300;letter-spacing:-1px">${w.temp} °C</span> <span style="font-size:15px;font-weight:600">· ${esc(t.sky[w.kind])}</span></div>
<div style="font-family:${mono};font-size:11px;color:${B.muted};margin-top:2px">${esc(t.weatherRange(w.min, w.max))}${w.rainChance !== null ? ` · ${esc(t.rainChance(w.rainChance))}` : ""}</div>
<div style="font-size:13px;margin-top:8px;color:${B.darkBlue};font-weight:600">→ ${esc(t.skyTip[w.kind])}</div>
</td></tr></table>
</td></tr>` : ""}

<tr><td style="padding:26px 26px 4px">
${eyebrow(t.secDetails)}${h2(t.detailsTitle)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
${rows.filter(([k]) => k !== t.ref).map(([k, v]) => `<tr><td style="padding:11px 0;border-bottom:1px solid ${LINE};font-family:${mono};font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${B.muted};width:38%;vertical-align:top">${esc(k)}</td><td style="padding:11px 0;border-bottom:1px solid ${LINE};font-weight:600;color:${N9}">${esc(v)}</td></tr>`).join("\n")}
</table>
</td></tr>

<tr><td align="center" style="padding:24px 26px 6px">
${primary(d.manageUrl, t.manage)}
<div style="margin-top:10px">${d.mapsUrl ? ghost(d.mapsUrl, `${esc(t.maps)} ↗`) : ""}${cal ? ghost(cal.google, "Google Calendar +") + ghost(cal.outlook, "Outlook +") : ""}</div>
${cal ? `<div style="font-family:${mono};font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${B.muted};margin-top:6px">${esc(t.calendar)}</div>` : ""}
<p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:${B.muted}">${esc(t.manageNote)}</p>
</td></tr>

${gallery.length ? `<tr><td style="padding:22px 20px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${gallery.map((u) => `<td style="padding:0 6px" width="${Math.floor(100 / gallery.length)}%"><img src="${esc(u)}" alt="${esc(d.tourTitle)}" width="270" style="display:block;width:100%;height:auto;border-radius:14px;border:0"></td>`).join("")}</tr></table></td></tr>` : ""}

${reviews.length ? `<tr><td style="padding:30px 26px 0">
${eyebrow(t.secReviews)}${h2(t.reviewsTitle)}
${reviews.map((r) => `<div style="border:1px solid ${LINE};border-radius:14px;padding:16px 18px;margin-bottom:10px">
<div style="color:#F5B301;font-size:14px;letter-spacing:2px">${stars(r.rate)}</div>
<div style="font-size:15px;line-height:1.5;color:${N9};margin:6px 0 8px">“${esc(r.text)}”</div>
<div style="font-family:${mono};font-size:11px;letter-spacing:1px;color:${B.muted}">— ${esc(r.name)}</div></div>`).join("\n")}
</td></tr>` : ""}

<tr><td style="padding:30px 26px 0">
${eyebrow(t.secTips)}${h2(t.tipsTitle)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${t.tips(!!d.isFree).map((x, i) => `<tr><td width="38" valign="top" style="padding:0 0 12px"><div style="width:26px;height:26px;line-height:26px;border-radius:8px;background:${SOFT};border:1px solid ${LINE};text-align:center;font-family:${mono};font-size:12px;font-weight:700;color:${B.lightBlue}">${i + 1}</div></td><td valign="top" style="padding:3px 0 12px;font-size:14px;line-height:1.5;color:${N9}">${esc(x)}</td></tr>`).join("")}</table>
</td></tr>

${waUrl || assistantUrl ? `<tr><td style="padding:22px 22px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${N9};background-image:linear-gradient(135deg,${N9},${N8});border-radius:16px"><tr><td align="center" style="padding:24px 18px">
${eyebrow(t.secHelp, DIM)}${h2(t.help, "#ffffff")}
${waUrl ? `<a href="${esc(waUrl)}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 20px;border-radius:10px;margin:4px">${esc(t.whatsapp)}</a>` : ""}
${assistantUrl ? `<a href="${esc(assistantUrl)}" style="display:inline-block;border:1px solid ${B.lightBlue};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 20px;border-radius:10px;margin:4px">✦ ${esc(t.assistant)}</a>` : ""}
</td></tr></table>
</td></tr>` : ""}

${more.length ? `<tr><td style="padding:30px 26px 0">
${eyebrow(t.secMore)}${h2(t.more(d.cityName ?? null))}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${more.map((x) => `<td valign="top" width="${Math.floor(100 / more.length)}%" style="padding:0 5px">
<a href="${esc(x.url)}" style="text-decoration:none;color:${N9}"><img src="${esc(x.imageUrl)}" alt="${esc(x.title)}" width="170" style="display:block;width:100%;height:auto;border-radius:12px;border:0">
<div style="font-size:13px;font-weight:600;line-height:1.3;margin-top:10px;color:${N9}">${esc(x.title)}</div>
<div style="font-family:${mono};font-size:11px;margin-top:6px;color:${B.muted}">${x.rating ? `<span style="color:#F5B301">★</span> ${x.rating.toFixed(1)}&nbsp; ` : ""}${x.isFree ? `<span style="border:1px solid ${B.lightBlue};color:${B.lightBlue};font-weight:700;padding:1px 7px;border-radius:6px;text-transform:uppercase;letter-spacing:1px;font-size:10px">${esc(t.free)}</span>` : ""}</div>
<div style="font-size:12px;font-weight:700;color:${B.lightBlue};margin-top:8px">${esc(t.see)} →</div></a></td>`).join("")}</tr></table>
</td></tr>` : ""}`;

  const html = renderShell({
    lang: d.lang,
    subject,
    preheader: `${badge} · ${d.tourTitle} · ${d.refNumber}`,
    logoUrl: d.logoUrl,
    animatedLogoUrl: d.animatedLogoUrl,
    iconsBaseUrl: d.iconsBaseUrl,
    manageUrl: d.manageUrl,
    waUrl,
    socials,
    labels: { myBooking: t.myBooking, help: t.helpShort, follow: t.follow, footer: t.footer, slogan: t.slogan },
    credit: w ? t.weatherCredit : null,
    body,
  });

  const text = [
    hero + (days !== null ? ` (${t.countdown(days)})` : ""),
    "",
    t.hello(d.firstName),
    t.intro,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(d.mapsUrl ? [`${t.maps}: ${d.mapsUrl}`] : []),
    ...(cal ? [`${t.calendar} (Google): ${cal.google}`] : []),
    ...(w ? [`${t.weatherTitle}: ${w.temp} °C, ${t.sky[w.kind]} (${t.weatherRange(w.min, w.max)}). ${t.skyTip[w.kind]}`] : []),
    "",
    `${t.manage}: ${d.manageUrl}`,
    t.manageNote,
    ...(reviews.length ? ["", t.reviewsTitle, ...reviews.map((r) => `${stars(r.rate)} "${r.text}" — ${r.name}`)] : []),
    "",
    t.tipsTitle,
    ...t.tips(!!d.isFree).map((x) => `- ${x}`),
    ...(waUrl ? ["", `${t.whatsapp}: ${waUrl}`] : []),
    ...(assistantUrl ? [`${t.assistant}: ${assistantUrl}`] : []),
    ...(more.length ? ["", t.more(d.cityName ?? null), ...more.map((x) => `- ${x.title}: ${x.url}`)] : []),
    ...(socials.length ? ["", `${t.follow}: ${socials.map((x) => `${x.name} ${x.url}`).join(" · ")}`] : []),
    "",
    `${t.slogan} · ${t.footer}`,
  ].join("\n");

  return { subject, html, text };
}
