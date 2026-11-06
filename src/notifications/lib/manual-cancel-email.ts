/** Aviso al equipo cuando Freetour no acepta la cancelación por API (REQ-017). Puro. REQ-302: con el encabezado de la marca. */
import { esc, renderShell, UI } from "./email-layout";

export interface ManualCancelData {
  refNumber: string;
  eventId: number | string;
  eventDate: string | null;
  adults: number;
  children: number;
  firstName: string;
  lastName: string;
  email: string;
  /** Motivo que dio Freetour, si lo hubo. */
  detail: { status: number; message: string } | null;
  logoUrl: string;
}

export function buildManualCancelTeamEmail(d: ManualCancelData) {
  const subject = `Cancelación por hacer a mano – ${d.refNumber}`;
  const why = `El cliente pidió cancelar y Freetour no lo aceptó por API (${d.detail ? `${d.detail.status} ${d.detail.message}` : "sin detalle"}).`;
  const lines = [
    `Reserva: ${d.refNumber}`,
    `Evento: ${d.eventId} (${d.eventDate ?? ""})`,
    `Personas: ${d.adults} adultos, ${d.children} niños`,
    `Cliente: ${d.firstName} ${d.lastName} <${d.email}>`,
  ];
  const todo = "Cancélala en el panel de Freetour y confirma al cliente por correo.";
  const body = `<tr><td style="padding:26px">
<h1 style="margin:0 0 10px;font-size:22px;color:${UI.N9}">${esc(subject)}</h1>
<p style="font-size:15px;line-height:1.55;color:${UI.N9};margin:0 0 12px">${esc(why)}</p>
<pre style="font-family:inherit;font-size:14px;line-height:1.6;color:${UI.N9};white-space:pre-wrap;margin:0 0 12px">${esc(lines.join("\n"))}</pre>
<p style="font-size:15px;line-height:1.55;color:${UI.N9};margin:0">${esc(todo)}</p>
</td></tr>`;
  const html = renderShell({
    lang: "es",
    subject,
    preheader: why,
    logoUrl: d.logoUrl,
    labels: { myBooking: "", help: "", follow: "", footer: "Aviso interno · Travel Puzzle", slogan: "Te armamos tu viaje" },
    body,
  });
  return { subject, html, text: [why, "", ...lines, "", todo].join("\n") };
}
