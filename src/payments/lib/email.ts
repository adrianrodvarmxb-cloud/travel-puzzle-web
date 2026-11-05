/** Correos de pago: enlace (REQ-114) y confirmación (REQ-117). Puro. */
import { esc, kit, renderShell, UI } from "@/notifications/lib/email-layout";
import { BRAND as B } from "@/notifications/lib/brand";
import { kindLabel, type PaymentKind } from "./checkout";

export interface PayMailInput {
  ref: string; tripTitle: string; firstName: string; kind: PaymentKind; centavos: number; logoUrl: string;
}

const LABELS = { myBooking: "", help: "", follow: "", footer: "Travel Puzzle México", slogan: "Te armamos tu viaje" };

export function formatMXN(centavos: number): string {
  const n = centavos / 100;
  const s = n.toLocaleString("es-MX", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
  return `MXN $${s}`;
}

function shell(subject: string, preheader: string, logoUrl: string, body: string) {
  return renderShell({ lang: "es", subject, preheader, logoUrl, labels: LABELS, body });
}

function summary(i: PayMailInput) {
  const { N9, LINE, SOFT } = UI;
  const rows: [string, string][] = [["Folio", i.ref], ["Viaje", i.tripTitle], ["Concepto", kindLabel(i.kind)], ["Monto", formatMXN(i.centavos)]];
  const html = `<table role="presentation" style="margin-top:16px;width:100%;background:${SOFT};border:1px solid ${LINE};border-radius:12px;padding:10px 16px">${rows
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:${B.muted};font-size:13px;width:110px">${esc(k)}</td><td style="padding:6px 0;color:${N9};font-size:14px;font-weight:600">${esc(v)}</td></tr>`)
    .join("")}</table>`;
  return { html, text: rows.map(([k, v]) => `${k}: ${v}`) };
}

// REQ-114 / REQ-116
export function buildPaymentLinkEmail(i: PayMailInput, url: string) {
  const subject = `Travel Puzzle / Tu enlace de pago · ${i.ref}`;
  const lead = `Hola ${i.firstName}, confirmamos lugar para tu viaje. Puedes pagar con tarjeta en el enlace seguro de Stripe.`;
  const note = "El enlace es válido por 24 horas. Si vence, escríbenos y te mandamos uno nuevo.";
  const s = summary(i);
  const body = `<tr><td style="padding:26px 26px 0">
<h1 style="margin:0 0 8px;font-size:24px;line-height:1.2;color:${UI.N9}">Tu enlace de pago</h1>
<p style="font-size:15px;line-height:1.55;color:${UI.N9};margin:0">${esc(lead)}</p>
${s.html}
<p style="font-size:12px;color:${B.muted};margin:12px 0 0">${esc(note)}</p>
</td></tr>
<tr><td style="padding:22px 26px 0">${kit().primary(url, "Pagar con tarjeta")}</td></tr>`;
  const text = [subject, "", lead, "", ...s.text, "", `Pagar: ${url}`, "", note].join("\n");
  return { subject, html: shell(subject, lead, i.logoUrl, body), text };
}

// REQ-117
export function buildPaidCustomerEmail(i: PayMailInput) {
  const subject = `Travel Puzzle / Recibimos tu pago · ${i.ref}`;
  const lead = `Gracias, ${i.firstName}. Recibimos tu pago y tu asesor te enviará la confirmación de tu viaje.`;
  const s = summary(i);
  const body = `<tr><td style="padding:26px 26px 0">
<h1 style="margin:0 0 8px;font-size:24px;line-height:1.2;color:${UI.N9}">Pago recibido</h1>
<p style="font-size:15px;line-height:1.55;color:${UI.N9};margin:0">${esc(lead)}</p>
${s.html}
</td></tr>`;
  const text = [subject, "", lead, "", ...s.text].join("\n");
  return { subject, html: shell(subject, lead, i.logoUrl, body), text };
}

// REQ-117
export function buildPaidTeamEmail(i: PayMailInput, adminUrl: string) {
  const subject = `Pago recibido ${i.ref} · ${kindLabel(i.kind)} ${formatMXN(i.centavos)}`;
  const lines = [`Folio: ${i.ref}`, `Viaje: ${i.tripTitle}`, `Concepto: ${kindLabel(i.kind)}`, `Monto: ${formatMXN(i.centavos)}`, "", `Panel: ${adminUrl}`];
  const text = lines.join("\n");
  const html = `<pre style="font-family:Arial,sans-serif;font-size:14px">${esc(text)}</pre>`;
  return { subject, html, text };
}
