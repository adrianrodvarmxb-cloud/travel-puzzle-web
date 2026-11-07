/** REQ-248: correo interno con el mensaje del formulario (texto y HTML escapado). Puro. */
import type { ContactMessage, InboundMessage } from "../schemas/message";

const TOPIC: Record<ContactMessage["topic"], string> = { viaje: "Quiero armar un viaje", reserva: "Tengo una reserva", otro: "Otro tema" };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const plain = (s: string) => s.replace(/<[^>]*>/g, "").replace(/[\r\n]+/g, " ").trim();

export function buildContactEmail(m: InboundMessage): { subject: string; html: string; text: string } {
  const advisor = m.kind === "asesor";
  const rows: [string, string][] = [
    ["Nombre", m.name],
    ["Correo", m.email],
    ...(m.phone ? [[advisor ? "WhatsApp" : "Teléfono", m.phone] as [string, string]] : []),
    ...(advisor
      ? ([["Destino", m.destination], ...(m.when ? [["Cuándo", m.when]] : [])] as [string, string][])
      : ([["Tema", TOPIC[m.topic]]] as [string, string][])),
    ["Idioma del sitio", m.language],
  ];
  const text = [...rows.map(([k, v]) => `${k}: ${v}`), "", m.message || "(sin mensaje)", "", "Responde a este correo para contestarle (va a su dirección)."].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#0A1330">
<p><strong>${advisor ? "Solicitud de asesor de viaje (/asesores)" : "Mensaje desde el formulario de /contacto"}</strong></p>
<table cellpadding="4">${rows.map(([k, v]) => `<tr><td style="color:#5E6E96">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
<p style="white-space:pre-wrap;border-left:3px solid #008DFF;padding-left:12px">${esc(m.message || "(sin mensaje)")}</p>
<p style="color:#5E6E96;font-size:13px">Responde a este correo para contestarle (va a su dirección).</p>
</div>`;
  const subject = advisor ? `Asesor de viaje · ${plain(m.destination)} · ${plain(m.name)}` : `Contacto desde el sitio · ${TOPIC[(m as ContactMessage).topic]} · ${plain(m.name)}`;
  return { subject, html, text };
}
