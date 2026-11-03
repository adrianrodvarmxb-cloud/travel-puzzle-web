/**
 * Aviso interno (a info@) cuando un cliente deja una reseña: estrellas, texto,
 * botones Publicar / Ocultar (enlaces firmados) y acceso al panel. Función pura.
 */
import { BRAND as B } from "./brand";
import { esc, kit, renderShell, whatsappUrl, UI, MONO } from "./email-layout";

export interface ReviewAlertData {
  rate: number;
  content: string;
  displayName: string;
  consent: boolean;
  tourTitle: string;
  refNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  publishUrl: string;
  hideUrl: string;
  adminUrl: string;
  logoUrl: string;
}

export function buildReviewAlertEmail(d: ReviewAlertData) {
  const { N9, LINE, SOFT } = UI;
  const { status, primary, ghost } = kit();
  const stars = "★".repeat(d.rate);
  const followUp = d.rate <= 3;
  const subject = `${followUp ? "Dar seguimiento · reseña" : "Nueva reseña"} ${stars} · ${d.tourTitle}`;
  const wa = followUp ? whatsappUrl(d.customerPhone ?? undefined, `Hola ${d.customerName}, te escribimos de Travel Puzzle por tu tour ${d.tourTitle}.`) : null;

  const body = `<tr><td style="padding:26px 26px 0">
${status(followUp ? "Dar seguimiento" : "Reseña nueva", followUp ? B.red : "#3DDC84", followUp ? B.red : "#2E9E5B")}
<h1 style="margin:12px 0 4px;font-size:24px;line-height:1.2;color:${N9}">${esc(d.tourTitle)}</h1>
<div style="font-size:28px;color:#F5B301;letter-spacing:2px">${stars}<span style="color:#D5DCEE">${"★".repeat(5 - d.rate)}</span></div>
<div style="margin-top:14px;background:${SOFT};border:1px solid ${LINE};border-radius:12px;padding:14px 16px;font-size:15px;line-height:1.55;color:${N9};white-space:pre-line">${d.content ? esc(d.content) : "<em>(Solo estrellas, sin texto)</em>"}</div>
<p style="font-family:${MONO};font-size:11px;letter-spacing:1px;color:${B.muted};margin:12px 0 0">
${esc(d.consent ? `Se publicaría como: ${d.displayName}` : "El cliente no aceptó que se publique.")}<br>
Reserva ${esc(d.refNumber)} · ${esc(d.customerName)} · ${esc(d.customerEmail)}${d.customerPhone ? ` · ${esc(d.customerPhone)}` : ""}</p>
</td></tr>
<tr><td style="padding:22px 26px 0">
${d.consent ? primary(d.publishUrl, "Publicar en el sitio") : ""}
<div style="text-align:center;margin-top:10px">${ghost(d.hideUrl, "Ocultar")}${wa ? ghost(wa, "Escribirle por WhatsApp") : ""}${ghost(d.adminUrl, "Ver todas las reseñas")}</div>
<p style="font-size:12px;color:${B.muted};text-align:center;margin:12px 0 0">Los enlaces vencen en 7 días. Cada botón abre una página para confirmar.</p>
</td></tr>`;

  const html = renderShell({
    lang: "es",
    subject,
    preheader: `${stars} · ${d.content.slice(0, 80)}`,
    logoUrl: d.logoUrl,
    labels: { myBooking: "", help: "", follow: "", footer: "Aviso interno · Travel Puzzle", slogan: "Te armamos tu viaje" },
    body,
  });

  const text = [
    subject,
    "",
    d.content || "(Solo estrellas, sin texto)",
    "",
    d.consent ? `Se publicaría como: ${d.displayName}` : "El cliente no aceptó que se publique.",
    `Reserva ${d.refNumber} · ${d.customerName} · ${d.customerEmail}${d.customerPhone ? ` · ${d.customerPhone}` : ""}`,
    "",
    ...(d.consent ? [`Publicar: ${d.publishUrl}`] : []),
    `Ocultar: ${d.hideUrl}`,
    ...(wa ? [`WhatsApp: ${wa}`] : []),
    `Todas las reseñas: ${d.adminUrl}`,
  ].join("\n");

  return { subject, html, text };
}
