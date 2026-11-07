/**
 * REQ-247: mensaje del formulario de /contacto, validado con Zod antes de enviar.
 * Anti-spam sin llaves nuevas: campo trampa (`website`), tiempo mínimo de llenado y límite de enlaces.
 * El spam pasa la validación a propósito: el servidor responde «enviado» y no manda nada (no le enseña al bot qué falló).
 */
import { z } from "zod";

export const MIN_FILL_MS = 3000;
export const MAX_LINKS = 2;

export const TOPIC_VALUES = ["viaje", "reserva", "otro"] as const;

export const contactMessageSchema = z.object({
  kind: z.literal("contacto"),
  name: z.string().trim().min(2, "Escribe tu nombre").max(80),
  email: z.string().trim().toLowerCase().email("Revisa tu correo").max(254),
  phone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/, "Revisa tu teléfono").default(""),
  topic: z.enum(TOPIC_VALUES),
  message: z.string().trim().min(10, "Cuéntanos un poco más (mínimo 10 caracteres)").max(2000),
  consent: z.literal(true, "Acepta el aviso de privacidad para enviar"),
  /** Campo trampa: invisible para personas; si llega lleno es un bot. */
  website: z.string().max(500).default(""),
  /** Milisegundos entre que se pintó el formulario y el envío (medido en el navegador, no al pintar). */
  elapsedMs: z.number().int().min(0).max(86_400_000),
  language: z.string().max(5).default("es"),
});

export type ContactMessage = z.infer<typeof contactMessageSchema>;

/** REQ-251: formulario corto de «Habla con un asesor de viaje». Mismo anti-spam. */
export const advisorMessageSchema = z.object({
  kind: z.literal("asesor"),
  name: z.string().trim().min(2, "Escribe tu nombre").max(80),
  email: z.string().trim().toLowerCase().email("Revisa tu correo").max(254),
  phone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/, "Revisa tu WhatsApp").default(""),
  destination: z.string().trim().min(2, "¿A dónde quieres ir?").max(120),
  when: z.string().trim().max(120).default(""),
  message: z.string().trim().max(1000).default(""),
  consent: z.literal(true, "Acepta el aviso de privacidad para enviar"),
  website: z.string().max(500).default(""),
  elapsedMs: z.number().int().min(0).max(86_400_000),
  language: z.string().max(5).default("es"),
});
export type AdvisorMessage = z.infer<typeof advisorMessageSchema>;

/** REQ-252: lo que acepta /api/contacto (cada tipo con su bandera). */
export const inboundMessageSchema = z.discriminatedUnion("kind", [contactMessageSchema, advisorMessageSchema]);
export type InboundMessage = z.infer<typeof inboundMessageSchema>;

const LINK = /https?:\/\/|www\./gi;

// REQ-247
export function spamReason(m: { website: string; elapsedMs: number; message: string }): "trampa" | "rapido" | "enlaces" | null {
  if (m.website.trim()) return "trampa";
  if (m.elapsedMs < MIN_FILL_MS) return "rapido";
  if ((m.message.match(LINK) ?? []).length > MAX_LINKS) return "enlaces";
  return null;
}
