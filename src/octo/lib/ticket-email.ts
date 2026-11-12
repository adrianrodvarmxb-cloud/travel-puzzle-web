/** Correos de la compra directa de Big Bus (ola 3). Puro. */
import { esc, kit, renderShell, UI } from "@/notifications/lib/email-layout";
import { BRAND as B } from "@/notifications/lib/brand";
import type { Delivery } from "./booking-flow";

export interface TicketMailInput {
  ref: string;
  title: string;
  date: string;
  pax: string;
  firstName: string;
  logoUrl: string;
}

const LABELS = { myBooking: "", help: "", follow: "", footer: "Travel Puzzle México", slogan: "Te armamos tu viaje" };

function rows(list: [string, string][]) {
  return `<table role="presentation" style="margin-top:16px;width:100%;background:${UI.SOFT};border:1px solid ${UI.LINE};border-radius:12px;padding:10px 16px">${list
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:${B.muted};font-size:13px;width:130px">${esc(k)}</td><td style="padding:6px 0;color:${UI.N9};font-size:14px;font-weight:600">${esc(v)}</td></tr>`)
    .join("")}</table>`;
}

/**
 * Boleto: un código por reserva (voucher) o uno por persona (ticket), con la referencia del operador debajo
 * de cada código (regla de Ventrata). El PDF del operador trae el QR para escanear.
 */
// REQ-3420
export function buildTicketEmail(i: TicketMailInput, d: Delivery) {
  const subject = `Travel Puzzle / Tu boleto · ${i.ref}`;
  const lead = `Listo, ${i.firstName}. Tu compra quedó confirmada. Muestra el código en tu celular al subir.`;
  const ref = d.supplierReference ?? "—";
  const info: [string, string][] = [
    ["Folio Travel Puzzle", i.ref],
    ["Experiencia", i.title],
    ["Fecha", i.date],
    ["Personas", i.pax],
    ["Referencia del operador", ref],
  ];
  const codes = d.items
    .map((it, n) => {
      const label = it.kind === "voucher" ? "Código de tu reserva" : `Boleto ${n + 1}`;
      const pdf = it.pdfUrl ? `<div style="margin-top:10px">${kit().primary(it.pdfUrl, "Abrir boleto (PDF con QR)")}</div>` : "";
      const qr = it.qr ? `<div style="font-family:monospace;font-size:18px;font-weight:700;color:${UI.N9};margin-top:4px">${esc(it.qr)}</div>` : "";
      return `<div style="margin-top:16px;padding:14px 16px;border:1px solid ${UI.LINE};border-radius:12px"><div style="font-size:13px;color:${B.muted}">${esc(label)}</div>${qr}<div style="font-size:12px;color:${B.muted};margin-top:4px">Ref. ${esc(ref)}</div>${pdf}</div>`;
    })
    .join("");
  const body = `<tr><td style="padding:26px">
<h1 style="margin:0 0 8px;font-size:24px;line-height:1.2;color:${UI.N9}">Tu boleto</h1>
<p style="font-size:15px;line-height:1.55;color:${UI.N9};margin:0">${esc(lead)}</p>
${rows(info)}
${codes}
</td></tr>`;
  const text = [
    subject,
    "",
    lead,
    "",
    ...info.map(([k, v]) => `${k}: ${v}`),
    "",
    ...d.items.map((it, n) => `${it.kind === "voucher" ? "Código" : `Boleto ${n + 1}`}: ${it.qr ?? "—"} (Ref. ${ref})${it.pdfUrl ? ` · PDF: ${it.pdfUrl}` : ""}`),
  ].join("\n");
  return { subject, html: renderShell({ lang: "es", subject, preheader: lead, logoUrl: i.logoUrl, labels: LABELS, body }), text };
}

/** Aviso interno cuando algo requiere a una persona (pago sin confirmar, cancelación por reembolsar). */
// REQ-3419, REQ-3421
export function buildOctoTeamEmail(subject: string, lines: string[], logoUrl: string) {
  const text = lines.join("\n");
  const body = `<tr><td style="padding:26px"><h1 style="margin:0 0 10px;font-size:22px;color:${UI.N9}">${esc(subject)}</h1><pre style="font-family:inherit;font-size:14px;line-height:1.6;color:${UI.N9};white-space:pre-wrap;margin:0">${esc(text)}</pre></td></tr>`;
  const html = renderShell({ lang: "es", subject, preheader: subject, logoUrl, labels: { ...LABELS, footer: "Aviso interno · Travel Puzzle" }, body });
  return { subject, html, text };
}

/** Al cliente: recibimos la cancelación; el reembolso lo confirma el equipo según la política (la define el PO). */
// REQ-3421
export function buildCancelCustomerEmail(i: { ref: string; title: string; firstName: string; logoUrl: string }) {
  const subject = `Travel Puzzle / Cancelación recibida · ${i.ref}`;
  const lead = `Hola ${i.firstName}, tu cancelación de «${i.title}» quedó registrada con el operador. Te escribiremos con el detalle del reembolso.`;
  const body = `<tr><td style="padding:26px"><h1 style="margin:0 0 8px;font-size:24px;color:${UI.N9}">Cancelación recibida</h1><p style="font-size:15px;line-height:1.55;color:${UI.N9};margin:0">${esc(lead)}</p></td></tr>`;
  return { subject, html: renderShell({ lang: "es", subject, preheader: lead, logoUrl: i.logoUrl, labels: LABELS, body }), text: [subject, "", lead].join("\n") };
}
