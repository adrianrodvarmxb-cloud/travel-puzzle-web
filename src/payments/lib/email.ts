/** Correos de pago: enlace (REQ-159) y confirmación (REQ-117). Puro. */
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

// REQ-159 / REQ-116
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
  // REQ-302: el aviso interno también lleva el encabezado con el logo (antes era un <pre> suelto).
  const body = `<tr><td style="padding:26px"><h1 style="margin:0 0 10px;font-size:22px;color:${UI.N9}">${esc(subject)}</h1><pre style="font-family:inherit;font-size:14px;line-height:1.6;color:${UI.N9};white-space:pre-wrap;margin:0">${esc(text)}</pre></td></tr>`;
  const html = renderShell({ lang: "es", subject, preheader: `${i.ref} · ${kindLabel(i.kind)}`, logoUrl: i.logoUrl, labels: { ...LABELS, footer: "Aviso interno · Travel Puzzle" }, body });
  return { subject, html, text };
}

// REQ-3482
export function buildHeldCustomerEmail(i: PayMailInput) {
  const subject = `Travel Puzzle / Recibimos tu solicitud · ${i.ref}`;
  const lead = `Hola ${i.firstName}, recibimos tu solicitud y retuvimos ${formatMXN(i.centavos)} en tu tarjeta. Todavía no se cobra: lo confirmamos con el proveedor y, solo si hay lugar, se hace el cobro.`;
  const note = "Si no hay lugar o el proveedor no confirma, el dinero se libera en tu tarjeta sin costo para ti. La retención dura hasta 7 días; te escribiremos antes.";
  const s = summary({ ...i, kind: "total" });
  const body = `<tr><td style="padding:26px 26px 0">
<h1 style="margin:0 0 8px;font-size:24px;line-height:1.2;color:${UI.N9}">Tu tarjeta está retenida</h1>
<p style="font-size:15px;line-height:1.55;color:${UI.N9};margin:0">${esc(lead)}</p>
${s.html}
<p style="font-size:12px;color:${B.muted};margin:12px 0 0">${esc(note)}</p>
</td></tr>`;
  const text = [subject, "", lead, "", ...s.text, "", note].join("\n");
  return { subject, html: shell(subject, lead, i.logoUrl, body), text };
}

// REQ-3482
export function buildHeldTeamEmail(i: PayMailInput, adminUrl: string) {
  const subject = `Tarjeta retenida ${i.ref} · ${formatMXN(i.centavos)}`;
  const lines = [`Folio: ${i.ref}`, `Viaje: ${i.tripTitle}`, `Monto retenido: ${formatMXN(i.centavos)}`, "", "Falta confirmar con el proveedor: si hay lugar se cobra; si no, se libera.", "", `Panel: ${adminUrl}`];
  const text = lines.join("\n");
  const body = `<tr><td style="padding:26px"><h1 style="margin:0 0 10px;font-size:22px;color:${UI.N9}">${esc(subject)}</h1><pre style="font-family:inherit;font-size:14px;line-height:1.6;color:${UI.N9};white-space:pre-wrap;margin:0">${esc(text)}</pre></td></tr>`;
  const html = renderShell({ lang: "es", subject, preheader: `${i.ref} · retenida`, logoUrl: i.logoUrl, labels: { ...LABELS, footer: "Aviso interno · Travel Puzzle" }, body });
  return { subject, html, text };
}
