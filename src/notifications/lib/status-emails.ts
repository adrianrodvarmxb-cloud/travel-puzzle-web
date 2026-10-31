/**
 * Correos de cambio de estado de una reserva:
 * - rejected: el organizador rechazó la reserva (obligatorio en Modo 2 de Freetour).
 * - canceled: el cliente canceló desde su enlace.
 * - modified: el cliente cambió fecha, hora, idioma o personas (solo free tours).
 * Funciones puras, con el mismo marco visual que la confirmación.
 */
import { BRAND as B } from "./brand";
import { esc, kit, renderShell, whatsappUrl, UI, MONO, type ContactInfo } from "./email-layout";
import { describeBooking, calendarLinks, type EmailLang } from "./booking-email";

export type StatusKind = "rejected" | "canceled" | "modified";

export interface StatusEmailData {
  kind: StatusKind;
  lang: EmailLang;
  refNumber: string;
  firstName: string;
  tourTitle: string;
  eventDate: string | null;
  duration?: string | null;
  tourLanguage: string | null;
  adults: number;
  children: number;
  meetingPoint?: string | null;
  /** Motivo del rechazo, si el organizador lo indicó. */
  reason?: string | null;
  /** Enlace privado de la reserva (solo en "modified"; en las demás ya no aplica). */
  manageUrl?: string | null;
  /** Página del tour, para reservar otra fecha. */
  tourUrl?: string | null;
  /** Otros tours en la misma ciudad (alternativas). */
  cityName?: string | null;
  moreTours?: { title: string; url: string; imageUrl: string; rating?: number | null; isFree?: boolean }[];
  logoUrl: string;
  animatedLogoUrl?: string;
  iconsBaseUrl?: string;
  contact?: ContactInfo;
}

const T = {
  es: {
    rejected: {
      subject: (t: string) => `Tu reserva no pudo confirmarse – ${t}`,
      status: "Reserva rechazada",
      hero: "Tu reserva no pudo confirmarse",
      intro: (n: string) => `Hola ${n}: el organizador del tour no pudo aceptar tu reserva. No se te cobró nada y no tienes que hacer nada más.`,
      reason: "Motivo indicado por el organizador",
      cta: "Buscar otra fecha de este tour",
      moreTitle: (c: string | null) => (c ? `Otros planes en ${c}` : "Otros planes para tu viaje"),
    },
    canceled: {
      subject: (t: string) => `Tu reserva quedó cancelada – ${t}`,
      status: "Reserva cancelada",
      hero: "Listo, cancelamos tu reserva",
      intro: (n: string) => `Hola ${n}: tu lugar quedó liberado para otro viajero. Gracias por avisar a tiempo.`,
      reason: "",
      cta: "Reservar otra fecha",
      moreTitle: (c: string | null) => (c ? `¿Otro plan en ${c}?` : "¿Otro plan para tu viaje?"),
    },
    modified: {
      subject: (t: string) => `Tu reserva se actualizó – ${t}`,
      status: "Reserva modificada",
      hero: "Tu reserva se actualizó",
      intro: (n: string) => `Hola ${n}: guardamos tus cambios. Estos son los datos nuevos de tu reserva:`,
      reason: "",
      cta: "Ver, cambiar o cancelar mi reserva",
      moreTitle: (c: string | null) => (c ? `Más planes en ${c}` : "Más planes para tu viaje"),
    },
    ref: "Número de reserva", when: "Cuándo", who: "Quiénes", lang: "Idioma", tour: "Tour",
    calendar: "Actualiza tu calendario",
    help: "¿Dudas? Estamos para ayudarte",
    whatsapp: "Escríbenos por WhatsApp",
    waText: (ref: string) => `Hola Travel Puzzle, tengo la reserva ${ref} y tengo una duda.`,
    explore: "Explora", support: "Soporte",
    free: "Gratis", see: "Ver tour",
    myBooking: "Mi reserva", helpShort: "Ayuda", follow: "Síguenos", slogan: "Armamos tu viaje",
    footer: "Travel Puzzle México · travelpuzzle.com.mx",
  },
  en: {
    rejected: {
      subject: (t: string) => `Your booking couldn't be confirmed – ${t}`,
      status: "Booking declined",
      hero: "Your booking couldn't be confirmed",
      intro: (n: string) => `Hi ${n}, the tour organizer couldn't accept your booking. You haven't been charged and there's nothing else you need to do.`,
      reason: "Reason given by the organizer",
      cta: "Find another date for this tour",
      moreTitle: (c: string | null) => (c ? `Other things to do in ${c}` : "Other ideas for your trip"),
    },
    canceled: {
      subject: (t: string) => `Your booking has been canceled – ${t}`,
      status: "Booking canceled",
      hero: "Done, your booking is canceled",
      intro: (n: string) => `Hi ${n}, your spot is now free for another traveler. Thanks for letting us know in time.`,
      reason: "",
      cta: "Book another date",
      moreTitle: (c: string | null) => (c ? `Another plan in ${c}?` : "Another plan for your trip?"),
    },
    modified: {
      subject: (t: string) => `Your booking has been updated – ${t}`,
      status: "Booking updated",
      hero: "Your booking has been updated",
      intro: (n: string) => `Hi ${n}, we saved your changes. Here are your new booking details:`,
      reason: "",
      cta: "View, change or cancel my booking",
      moreTitle: (c: string | null) => (c ? `More things to do in ${c}` : "More ideas for your trip"),
    },
    ref: "Booking number", when: "When", who: "Who", lang: "Language", tour: "Tour",
    calendar: "Update your calendar",
    help: "Questions? We're here to help",
    whatsapp: "Message us on WhatsApp",
    waText: (ref: string) => `Hi Travel Puzzle, I have booking ${ref} and a question.`,
    explore: "Explore", support: "Support",
    free: "Free", see: "See tour",
    myBooking: "My booking", helpShort: "Help", follow: "Follow us", slogan: "Armamos tu viaje",
    footer: "Travel Puzzle México · travelpuzzle.com.mx",
  },
};

const STATUS_COLOR: Record<StatusKind, { dot: string; text: string }> = {
  rejected: { dot: "#FF6B5A", text: "#FFB3A8" },
  canceled: { dot: B.yellow, text: "#F3F8B0" },
  modified: { dot: B.lightBlue, text: "#9FD3FF" },
};

export function buildStatusEmail(d: StatusEmailData) {
  const t = T[d.lang];
  const k = t[d.kind];
  const { N9, N8, LINE, DIM } = UI;
  const { eyebrow, h2, ghost, primary, passCell, status } = kit();
  const { when, people, tourLang } = describeBooking(d.lang, d);
  const waUrl = whatsappUrl(d.contact?.whatsapp, t.waText(d.refNumber));
  const isActive = d.kind === "modified";
  const ctaUrl = isActive ? d.manageUrl : d.tourUrl;
  const cal = isActive && d.manageUrl
    ? calendarLinks({ title: d.tourTitle, eventDate: d.eventDate, duration: d.duration ?? null, location: d.meetingPoint ?? null, details: `${t.ref}: ${d.refNumber}\n${d.manageUrl}` })
    : null;
  const more = (d.moreTours ?? []).filter((x) => /^https:\/\//.test(x.imageUrl) && /^https?:\/\//.test(x.url)).slice(0, 3);
  const reason = d.kind === "rejected" && d.reason?.trim() ? d.reason.trim().slice(0, 400) : null;
  const subject = k.subject(d.tourTitle);
  const color = STATUS_COLOR[d.kind];
  const dim = !isActive ? "opacity:0.75;" : "";

  const body = `<tr><td style="background:${N9};background-image:linear-gradient(160deg,${N9} 0%,${N8} 55%,${B.darkBlue} 100%);padding:26px 26px 30px">
${status(k.status, color.dot, color.text)}
<h1 style="margin:14px 0 8px;font-size:30px;line-height:1.15;color:#ffffff;font-weight:700;letter-spacing:-0.6px">${esc(k.hero)}</h1>
<p style="margin:0;font-size:15px;line-height:1.55;color:#C9D6F5">${esc(k.intro(d.firstName))}</p>
</td></tr>

<tr><td style="padding:24px 22px 6px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${N9};background-image:linear-gradient(135deg,${N9},${N8});border-radius:16px;border:1px solid #22336B;${dim}">
<tr><td colspan="3" style="padding:16px 16px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font-family:${MONO};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${DIM}">${esc(t.ref)}</td>
<td align="right" style="font-family:${MONO};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${color.text}">● ${esc(k.status)}</td>
</tr></table>
<div style="font-family:${MONO};font-size:22px;font-weight:700;color:#ffffff;letter-spacing:1.5px;margin-top:6px;word-break:break-all${isActive ? "" : ";text-decoration:line-through;text-decoration-color:#5F73AD"}">${esc(d.refNumber)}</div>
<div style="font-size:14px;font-weight:600;color:#C9D6F5;margin-top:6px">${esc(d.tourTitle)}</div>
</td></tr>
<tr><td colspan="3" style="padding:0 16px"><div style="border-top:1px dashed #34467F;height:0;line-height:0;font-size:0">&nbsp;</div></td></tr>
<tr>${passCell(t.when, when ?? "—")}${passCell(t.who, people)}${passCell(t.lang, tourLang ?? "—")}</tr>
</table>
</td></tr>

${reason ? `<tr><td style="padding:12px 22px 0"><div style="border:1px solid ${LINE};border-left:4px solid #FF6B5A;border-radius:12px;padding:14px 16px">
<div style="font-family:${MONO};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${B.muted}">${esc(k.reason)}</div>
<div style="font-size:14px;line-height:1.5;color:${N9};margin-top:4px">${esc(reason)}</div></div></td></tr>` : ""}

${ctaUrl ? `<tr><td align="center" style="padding:24px 26px 0">
${primary(ctaUrl, k.cta)}
${cal ? `<div style="margin-top:10px">${ghost(cal.google, "Google Calendar +")}${ghost(cal.outlook, "Outlook +")}</div><div style="font-family:${MONO};font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${B.muted};margin-top:6px">${esc(t.calendar)}</div>` : ""}
</td></tr>` : ""}

${more.length ? `<tr><td style="padding:30px 26px 0">
${eyebrow(t.explore)}${h2(k.moreTitle(d.cityName ?? null))}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${more.map((x) => `<td valign="top" width="${Math.floor(100 / more.length)}%" style="padding:0 5px">
<a href="${esc(x.url)}" style="text-decoration:none;color:${N9}"><img src="${esc(x.imageUrl)}" alt="${esc(x.title)}" width="170" style="display:block;width:100%;height:auto;border-radius:12px;border:0">
<div style="font-size:13px;font-weight:600;line-height:1.3;margin-top:10px;color:${N9}">${esc(x.title)}</div>
<div style="font-family:${MONO};font-size:11px;margin-top:6px;color:${B.muted}">${x.rating ? `<span style="color:#F5B301">★</span> ${x.rating.toFixed(1)}&nbsp; ` : ""}${x.isFree ? `<span style="border:1px solid ${B.lightBlue};color:${B.lightBlue};font-weight:700;padding:1px 7px;border-radius:6px;text-transform:uppercase;letter-spacing:1px;font-size:10px">${esc(t.free)}</span>` : ""}</div>
<div style="font-size:12px;font-weight:700;color:${B.lightBlue};margin-top:8px">${esc(t.see)} →</div></a></td>`).join("")}</tr></table>
</td></tr>` : ""}

${waUrl ? `<tr><td style="padding:26px 22px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${N9};background-image:linear-gradient(135deg,${N9},${N8});border-radius:16px"><tr><td align="center" style="padding:24px 18px">
${eyebrow(t.support, DIM)}${h2(t.help, "#ffffff")}
<a href="${esc(waUrl)}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 20px;border-radius:10px;margin:4px">${esc(t.whatsapp)}</a>
</td></tr></table>
</td></tr>` : ""}`;

  const html = renderShell({
    lang: d.lang,
    subject,
    preheader: `${k.status} · ${d.tourTitle} · ${d.refNumber}`,
    logoUrl: d.logoUrl,
    animatedLogoUrl: d.animatedLogoUrl,
    iconsBaseUrl: d.iconsBaseUrl,
    manageUrl: isActive ? d.manageUrl : null,
    waUrl,
    socials: d.contact?.socials,
    labels: { myBooking: t.myBooking, help: t.helpShort, follow: t.follow, footer: t.footer, slogan: t.slogan },
    body,
  });

  const text = [
    `${k.hero}`,
    "",
    k.intro(d.firstName),
    "",
    `${t.ref}: ${d.refNumber}`,
    `${t.tour}: ${d.tourTitle}`,
    ...(when ? [`${t.when}: ${when}`] : []),
    `${t.who}: ${people}`,
    ...(tourLang ? [`${t.lang}: ${tourLang}`] : []),
    ...(reason ? ["", `${k.reason}: ${reason}`] : []),
    ...(ctaUrl ? ["", `${k.cta}: ${ctaUrl}`] : []),
    ...(more.length ? ["", k.moreTitle(d.cityName ?? null), ...more.map((x) => `- ${x.title}: ${x.url}`)] : []),
    ...(waUrl ? ["", `${t.whatsapp}: ${waUrl}`] : []),
    "",
    `${t.slogan} · ${t.footer}`,
  ].join("\n");

  return { subject, html, text };
}
