/** Correos de la solicitud de cotización (documento 2024): al cliente y aviso al equipo. Puro. */
import { esc, kit, renderShell, whatsappUrl, UI } from "@/notifications/lib/email-layout";
import { BRAND as B } from "@/notifications/lib/brand";

export interface RequestSummary {
  ref: string; tripTitle: string; tripCode: string; tripUrl: string; kind: "reserva" | "personalizado";
  when: string; option: string | null; pax: string; estimate: string | null;
  name: string; email: string; phone: string; hotel: string; comments: string;
  logoUrl: string; whatsapp?: string; adminUrl: string;
}

const COPY = {
  es: { subject: "Travel Puzzle / Solicitud de cotización", title: "Recibimos tu solicitud", lead: "En breve un agente se comunicará contigo para dar seguimiento a tu solicitud.", folio: "Folio", trip: "Viaje", when: "Fecha", option: "Opción", pax: "Personas", est: "Estimado", note: "El estimado es informativo; tu asesor te confirma precio y disponibilidad.", wa: "Escríbenos por WhatsApp" },
  en: { subject: "Travel Puzzle / Quote request", title: "We received your request", lead: "An agent will contact you shortly to follow up on your request.", folio: "Reference", trip: "Trip", when: "Date", option: "Option", pax: "Travelers", est: "Estimate", note: "The estimate is for reference; your advisor will confirm price and availability.", wa: "Message us on WhatsApp" },
};

export function buildRequestCustomerEmail(s: RequestSummary, lang: string) {
  const c = lang === "es" ? COPY.es : COPY.en;
  const { N9, LINE, SOFT } = UI;
  const { primary } = kit();
  const rows: [string, string | null][] = [[c.folio, s.ref], [c.trip, `${s.tripTitle} (${s.tripCode})`], [c.when, s.when], [c.option, s.option], [c.pax, s.pax], [c.est, s.estimate]];
  const table = rows.filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:6px 0;color:${B.muted};font-size:13px;width:110px">${esc(k)}</td><td style="padding:6px 0;color:${N9};font-size:14px;font-weight:600">${esc(v!)}</td></tr>`).join("");
  const wa = whatsappUrl(s.whatsapp, `Hola Travel Puzzle, mi folio es ${s.ref}.`);
  const body = `<tr><td style="padding:26px 26px 0">
<h1 style="margin:0 0 8px;font-size:24px;line-height:1.2;color:${N9}">${esc(c.title)}</h1>
<p style="font-size:15px;line-height:1.55;color:${N9};margin:0">${esc(c.lead)}</p>
<table role="presentation" style="margin-top:16px;width:100%;background:${SOFT};border:1px solid ${LINE};border-radius:12px;padding:10px 16px">${table}</table>
${s.comments ? `<p style="font-size:13px;color:${B.muted};margin:12px 0 0;white-space:pre-line">${esc(s.comments)}</p>` : ""}
<p style="font-size:12px;color:${B.muted};margin:12px 0 0">${esc(c.note)}</p>
</td></tr>
${wa ? `<tr><td style="padding:22px 26px 0">${primary(wa, c.wa)}</td></tr>` : ""}`;
  const html = renderShell({ lang: lang === "es" ? "es" : "en", subject: c.subject, preheader: c.lead, logoUrl: s.logoUrl, labels: { myBooking: "", help: "", follow: "", footer: "Travel Puzzle México", slogan: "Te armamos tu viaje" }, body });
  const text = [c.subject, "", c.lead, "", ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), ...(s.comments ? ["", s.comments] : []), "", c.note, ...(wa ? ["", `WhatsApp: ${wa}`] : [])].join("\n");
  return { subject: c.subject, html, text };
}

export function buildRequestTeamEmail(s: RequestSummary) {
  const subject = `Nueva solicitud ${s.ref} · ${s.tripTitle}`;
  const lines = [
    `Folio: ${s.ref}`, `Viaje: ${s.tripTitle} (${s.tripCode})`, `Tipo: ${s.kind === "personalizado" ? "Personalizado" : "Reserva / cotización"}`,
    `Fecha: ${s.when}`, ...(s.option ? [`Opción: ${s.option}`] : []), `Personas: ${s.pax}`, ...(s.estimate ? [`Estimado: ${s.estimate}`] : []),
    `Cliente: ${s.name}`, `Correo: ${s.email}`, `Teléfono: ${s.phone}`, ...(s.hotel ? [`Hotel: ${s.hotel}`] : []), ...(s.comments ? [`Comentarios: ${s.comments}`] : []),
    `Ficha: ${s.tripUrl}`, `Panel: ${s.adminUrl}`,
  ];
  const body = `<tr><td style="padding:26px"><h1 style="margin:0 0 10px;font-size:22px;color:${UI.N9}">${esc(subject)}</h1><pre style="font-family:inherit;font-size:14px;line-height:1.6;color:${UI.N9};white-space:pre-wrap;margin:0">${esc(lines.join("\n"))}</pre></td></tr>`;
  const html = renderShell({ lang: "es", subject, preheader: `${s.name} · ${s.pax}`, logoUrl: s.logoUrl, labels: { myBooking: "", help: "", follow: "", footer: "Aviso interno · Travel Puzzle", slogan: "Te armamos tu viaje" }, body });
  return { subject, html, text: [subject, "", ...lines].join("\n") };
}
