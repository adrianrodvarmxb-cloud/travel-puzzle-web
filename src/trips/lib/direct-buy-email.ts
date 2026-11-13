/** REQ-3533 / REQ-3534: correos de la compra directa (cliente, proveedor y equipo). Puro. */
import { esc, kit, renderShell, UI } from "@/notifications/lib/email-layout";
import { BRAND as B } from "@/notifications/lib/brand";
import { formatMXN } from "@/payments/lib/email";
import { SUPPLIER_WINDOW_HOURS } from "./direct-buy";

export interface BuyMailInput {
  ref: string; tripTitle: string; tripCode: string; firstName: string; lastName: string;
  date: string; time: string; optionName: string | null; pax: string; hotel: string; centavos: number; logoUrl: string;
}

const LABELS = { myBooking: "", help: "", follow: "", footer: "Travel Puzzle México", slogan: "Te armamos tu viaje" };
type Mail = { subject: string; html: string; text: string };

function table(rows: [string, string][]) {
  const { N9, LINE, SOFT } = UI;
  return `<table role="presentation" style="margin-top:16px;width:100%;background:${SOFT};border:1px solid ${LINE};border-radius:12px;padding:10px 16px">${rows
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:${B.muted};font-size:13px;width:120px">${esc(k)}</td><td style="padding:6px 0;color:${N9};font-size:14px;font-weight:600">${esc(v)}</td></tr>`)
    .join("")}</table>`;
}

function mail(subject: string, title: string, lead: string, rows: [string, string][], logoUrl: string, extra: { note?: string; button?: { url: string; label: string } } = {}): Mail {
  const body = `<tr><td style="padding:26px 26px 0">
<h1 style="margin:0 0 8px;font-size:24px;line-height:1.2;color:${UI.N9}">${esc(title)}</h1>
<p style="font-size:15px;line-height:1.55;color:${UI.N9};margin:0">${esc(lead)}</p>
${table(rows)}
${extra.note ? `<p style="font-size:13px;color:${B.muted};margin:12px 0 0">${esc(extra.note)}</p>` : ""}
</td></tr>${extra.button ? `\n<tr><td style="padding:22px 26px 0">${kit().primary(extra.button.url, extra.button.label)}</td></tr>` : ""}`;
  const text = [subject, "", lead, "", ...rows.map(([k, v]) => `${k}: ${v}`), ...(extra.note ? ["", extra.note] : []), ...(extra.button ? ["", `${extra.button.label}: ${extra.button.url}`] : [])].join("\n");
  return { subject, html: renderShell({ lang: "es", subject, preheader: lead, logoUrl, labels: LABELS, body }), text };
}

const when = (i: BuyMailInput) => (i.time ? `${i.date} · ${i.time}` : i.date);

function customerRows(i: BuyMailInput): [string, string][] {
  return [["Folio", i.ref], ["Viaje", i.tripTitle], ["Fecha", when(i)], ...(i.optionName ? [["Opción", i.optionName] as [string, string]] : []), ["Personas", i.pax], ["Pagado", formatMXN(i.centavos)]];
}

// REQ-3533: «Recibimos tu pago»; el proveedor confirma en hasta 48 h (gate 2 = como Viator).
export function buildBuyPaidCustomerEmail(i: BuyMailInput): Mail {
  return mail(
    `Travel Puzzle / Recibimos tu pago · ${i.ref}`,
    "Pago recibido",
    `Gracias, ${i.firstName}. Recibimos tu pago y ya le pedimos al proveedor que confirme tu lugar.`,
    customerRows(i),
    i.logoUrl,
    { note: `Te confirmamos en máximo ${SUPPLIER_WINDOW_HOURS} horas. Si el proveedor no tiene lugar, te devolvemos el total a la misma tarjeta.` }
  );
}

// REQ-3534
export function buildBuyConfirmedCustomerEmail(i: BuyMailInput): Mail {
  return mail(`Travel Puzzle / Tu viaje está confirmado · ${i.ref}`, "Viaje confirmado", `${i.firstName}, el proveedor confirmó tu lugar. ¡Tu viaje está listo!`, customerRows(i), i.logoUrl, {
    note: "Si necesitas algo antes del viaje, responde este correo y te ayudamos.",
  });
}

// REQ-3534
export function buildBuyRefundedCustomerEmail(i: BuyMailInput): Mail {
  return mail(
    `Travel Puzzle / Te devolvimos tu pago · ${i.ref}`,
    "Reembolso total",
    `${i.firstName}, el proveedor no pudo confirmar lugar para esta fecha, así que te devolvimos el total a tu tarjeta.`,
    customerRows(i),
    i.logoUrl,
    { note: "El banco puede tardar de 5 a 10 días hábiles en reflejarlo. Si quieres otra fecha u otro viaje, responde este correo." }
  );
}

// REQ-3534: al proveedor no se le manda el monto cobrado (incluye el margen) ni los datos de contacto del cliente.
export function buildSupplierRequestEmail(i: BuyMailInput, link: string): Mail {
  return mail(
    `Travel Puzzle / Nueva reserva por confirmar · ${i.ref}`,
    "Nueva reserva por confirmar",
    `Tenemos una reserva pagada para ${i.tripTitle}. Por favor confirma si hay lugar en las próximas ${SUPPLIER_WINDOW_HOURS} horas.`,
    [["Folio", i.ref], ["Viaje", `${i.tripTitle} (${i.tripCode})`], ["Fecha", when(i)], ...(i.optionName ? [["Opción", i.optionName] as [string, string]] : []), ["Personas", i.pax], ["Titular", `${i.firstName} ${i.lastName}`], ...(i.hotel ? [["Hotel", i.hotel] as [string, string]] : [])],
    i.logoUrl,
    { note: `Si no recibimos respuesta en ${SUPPLIER_WINDOW_HOURS} horas, la reserva se cancela y se le devuelve el pago al cliente.`, button: { url: link, label: "Confirmar o rechazar" } }
  );
}

// REQ-3533 / REQ-3534: aviso al equipo (solo informa; nada espera su aprobación).
export function buildBuyTeamEmail(i: BuyMailInput, event: string, detail = ""): Omit<Mail, never> {
  return mail(`Compra directa · ${event} · ${i.ref}`, event, detail || `${i.tripTitle} (${i.tripCode})`, [...customerRows(i), ["Titular", `${i.firstName} ${i.lastName}`]], i.logoUrl);
}
