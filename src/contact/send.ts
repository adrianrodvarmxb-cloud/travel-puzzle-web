/**
 * REQ-248: orquesta el envío del formulario. Recibe sus dependencias por parámetro (DIP); no importa Resend.
 * Un solo correo al buzón del equipo, con reply-to del viajero. Nunca se escribe al viajero: así el formulario no
 * sirve para mandar correos a terceros. No se guarda nada en la base (sin migración).
 */
import { spamReason, type ContactMessage } from "./schemas/message";
import { buildContactEmail } from "./lib/email";

export interface ContactDeps {
  enabled: boolean;
  teamInbox: string;
  send: (mail: { to: string; replyTo: string; subject: string; html: string; text: string }) => Promise<string>;
  log: (line: string) => void;
}

export type ContactResult = { ok: true } | { ok: false; error: "no-disponible" | "envio" };

export async function submitContact(m: ContactMessage, d: ContactDeps): Promise<ContactResult> {
  if (!d.enabled || !d.teamInbox) return { ok: false, error: "no-disponible" };
  const spam = spamReason(m);
  if (spam) {
    d.log(`[contacto] descartado (${spam})`);
    return { ok: true };
  }
  try {
    await d.send({ to: d.teamInbox, replyTo: m.email, ...buildContactEmail(m) });
    return { ok: true };
  } catch (e) {
    d.log(`[contacto] no se envió: ${(e as Error).message}`);
    return { ok: false, error: "envio" };
  }
}
