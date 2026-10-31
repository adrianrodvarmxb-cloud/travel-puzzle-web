/**
 * Correo post-tour: pide la reseña (1 a 5 estrellas con un clic) y propone el siguiente plan.
 * Función pura, mismo marco visual que los demás correos.
 */
import { BRAND as B } from "./brand";
import { esc, kit, renderShell, supportCard, whatsappUrl, UI, MONO, type ContactInfo } from "./email-layout";
import type { EmailLang } from "./booking-email";

export interface ReviewEmailData {
  lang: EmailLang;
  refNumber: string;
  firstName: string;
  tourTitle: string;
  /** Página de reseña; cada estrella agrega ?rate=1..5. */
  reviewUrl: string;
  cityName?: string | null;
  moreTours?: { title: string; url: string; imageUrl: string; rating?: number | null; isFree?: boolean }[];
  logoUrl: string;
  animatedLogoUrl?: string;
  iconsBaseUrl?: string;
  contact?: ContactInfo;
}

const T = {
  es: {
    subject: (t: string) => `¿Qué tal estuvo tu tour? – ${t}`,
    status: "Tour completado",
    hero: "¿Qué tal estuvo tu tour?",
    intro: (n: string, t: string) => `Hola ${n}: esperamos que hayas disfrutado ${t}. Califícalo con un clic; tu opinión ayuda a otros viajeros y al guía.`,
    rateLabel: "1. Toca las estrellas",
    writeLabel: "2. Escribe tu reseña",
    writePlaceholder: "¿Qué te gustó del guía, del recorrido, de la ciudad? ¿Qué le recomendarías a otro viajero?",
    writeCta: "Escribir mi reseña",
    stars: ["Malo", "Regular", "Bueno", "Muy bueno", "Excelente"],
    tip: "Si te gustó, recuerda que en un free tour la propina es la forma de agradecer al guía.",
    next: "Tu siguiente plan", nextTitle: (c: string | null) => (c ? `Sigue explorando ${c}` : "Tu siguiente aventura"),
    free: "Gratis", see: "Ver tour",
    help: "¿Algo salió mal? Cuéntanos", whatsapp: "Escríbenos por WhatsApp", waSub: "Toca el botón y cuéntanos por WhatsApp; lo resolvemos contigo.", support: "Soporte",
    waText: (ref: string) => `Hola Travel Puzzle, tengo un comentario sobre mi tour (reserva ${ref}).`,
    myBooking: "Mi reserva", helpShort: "Ayuda", follow: "Síguenos", slogan: "Armamos tu viaje",
    footer: "Travel Puzzle México · travelpuzzle.com.mx",
  },
  en: {
    subject: (t: string) => `How was your tour? – ${t}`,
    status: "Tour completed",
    hero: "How was your tour?",
    intro: (n: string, t: string) => `Hi ${n}, we hope you enjoyed ${t}. Rate it in one click; your review helps other travelers and your guide.`,
    rateLabel: "1. Tap the stars",
    writeLabel: "2. Write your review",
    writePlaceholder: "What did you like about the guide, the route, the city? What would you tell another traveler?",
    writeCta: "Write my review",
    stars: ["Poor", "Fair", "Good", "Very good", "Excellent"],
    tip: "If you liked it, remember that on a free tour the tip is how you thank your guide.",
    next: "Your next plan", nextTitle: (c: string | null) => (c ? `Keep exploring ${c}` : "Your next adventure"),
    free: "Free", see: "See tour",
    help: "Something went wrong? Tell us", whatsapp: "Message us on WhatsApp", waSub: "Tap the button and tell us on WhatsApp; we'll sort it out with you.", support: "Support",
    waText: (ref: string) => `Hi Travel Puzzle, I have feedback about my tour (booking ${ref}).`,
    myBooking: "My booking", helpShort: "Help", follow: "Follow us", slogan: "Armamos tu viaje",
    footer: "Travel Puzzle México · travelpuzzle.com.mx",
  },
};

export function buildReviewRequestEmail(d: ReviewEmailData) {
  const t = T[d.lang];
  const { N9, N8, LINE, SOFT, DIM } = UI;
  const { eyebrow, h2, status, primary } = kit();
  const writeUrl = `${d.reviewUrl}${d.reviewUrl.includes("?") ? "&" : "?"}write=1`;
  const waUrl = whatsappUrl(d.contact?.whatsapp, t.waText(d.refNumber));
  const sep = d.reviewUrl.includes("?") ? "&" : "?";
  const rateUrl = (n: number) => `${d.reviewUrl}${sep}rate=${n}`;
  const more = (d.moreTours ?? []).filter((x) => /^https:\/\//.test(x.imageUrl) && /^https?:\/\//.test(x.url)).slice(0, 3);
  const subject = t.subject(d.tourTitle);

  const stars = [1, 2, 3, 4, 5]
    .map((n) => `<td align="center" width="20%" style="padding:0 3px"><a href="${esc(rateUrl(n))}" style="display:block;text-decoration:none;background:${SOFT};border:1px solid ${LINE};border-radius:12px;padding:12px 0 10px">
<div style="font-size:26px;line-height:1;color:#F5B301">${"★".repeat(n)}</div>
<div style="font-family:${MONO};font-size:10px;letter-spacing:1px;text-transform:uppercase;color:${B.muted};margin-top:6px">${esc(t.stars[n - 1])}</div></a></td>`)
    .join("");

  const body = `<tr><td style="background:${N9};background-image:linear-gradient(160deg,${N9} 0%,${N8} 55%,${B.darkBlue} 100%);padding:26px 26px 30px">
${status(t.status, "#3DDC84", "#7CE3A1")}
<h1 style="margin:14px 0 8px;font-size:30px;line-height:1.15;color:#ffffff;font-weight:700;letter-spacing:-0.6px">${esc(t.hero)}</h1>
<p style="margin:0;font-size:15px;line-height:1.55;color:#C9D6F5">${esc(t.intro(d.firstName, d.tourTitle))}</p>
</td></tr>

<tr><td style="padding:26px 20px 0">
<div style="font-family:${MONO};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${B.lightBlue};text-align:center;margin-bottom:10px">${esc(t.rateLabel)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${stars}</tr></table>
<div style="font-family:${MONO};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${B.lightBlue};text-align:center;margin:24px 0 10px">${esc(t.writeLabel)}</div>
<a href="${esc(writeUrl)}" style="display:block;text-decoration:none;border:1px solid ${LINE};border-radius:12px;background:#ffffff;padding:14px 16px;min-height:96px;height:96px">
<div style="font-size:14px;line-height:1.55;color:#9AA3B5">${esc(t.writePlaceholder)}</div></a>
<div style="margin-top:14px">${primary(writeUrl, t.writeCta)}</div>
<p style="margin:14px 6px 0;font-size:13px;line-height:1.5;color:${B.muted};text-align:center">${esc(t.tip)}</p>
</td></tr>

${more.length ? `<tr><td style="padding:30px 26px 0">
${eyebrow(t.next)}${h2(t.nextTitle(d.cityName ?? null))}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${more.map((x) => `<td valign="top" width="${Math.floor(100 / more.length)}%" style="padding:0 5px">
<a href="${esc(x.url)}" style="text-decoration:none;color:${N9}"><img src="${esc(x.imageUrl)}" alt="${esc(x.title)}" width="170" style="display:block;width:100%;height:auto;border-radius:12px;border:0">
<div style="font-size:13px;font-weight:600;line-height:1.3;margin-top:10px;color:${N9}">${esc(x.title)}</div>
<div style="font-family:${MONO};font-size:11px;margin-top:6px;color:${B.muted}">${x.rating ? `<span style="color:#F5B301">★</span> ${x.rating.toFixed(1)}&nbsp; ` : ""}${x.isFree ? `<span style="border:1px solid ${B.lightBlue};color:${B.lightBlue};font-weight:700;padding:1px 7px;border-radius:6px;text-transform:uppercase;letter-spacing:1px;font-size:10px">${esc(t.free)}</span>` : ""}</div>
<div style="font-size:12px;font-weight:700;color:${B.lightBlue};margin-top:8px">${esc(t.see)} →</div></a></td>`).join("")}</tr></table>
</td></tr>` : ""}

${supportCard({ eyebrow: eyebrow(t.support, DIM), title: t.help, subtitle: t.waSub, waUrl, waLabel: t.whatsapp, iconsBaseUrl: d.iconsBaseUrl })}`;

  const html = renderShell({
    lang: d.lang,
    subject,
    preheader: `${t.hero} · ${d.tourTitle}`,
    logoUrl: d.logoUrl,
    animatedLogoUrl: d.animatedLogoUrl,
    iconsBaseUrl: d.iconsBaseUrl,
    waUrl,
    socials: d.contact?.socials,
    labels: { myBooking: t.myBooking, help: t.helpShort, follow: t.follow, footer: t.footer, slogan: t.slogan },
    body,
  });

  const text = [
    t.hero,
    "",
    t.intro(d.firstName, d.tourTitle),
    "",
    ...[5, 4, 3, 2, 1].map((n) => `${"★".repeat(n)} ${t.stars[n - 1]}: ${rateUrl(n)}`),
    "",
    `${t.writeCta}: ${writeUrl}`,
    "",
    t.tip,
    ...(more.length ? ["", t.nextTitle(d.cityName ?? null), ...more.map((x) => `- ${x.title}: ${x.url}`)] : []),
    ...(waUrl ? ["", `${t.whatsapp}: ${waUrl}`] : []),
    "",
    `${t.slogan} · ${t.footer}`,
  ].join("\n");

  return { subject, html, text };
}
