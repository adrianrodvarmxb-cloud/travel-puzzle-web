/**
 * REQ-083: mensajes al proveedor por la API de FREETOUR (/booking/messages):
 * sin enlaces (la API responde 400) y máximo 5000 caracteres (skill cumplimiento-freetour, A5).
 * Puro. Hoy el sitio no envía mensajes al proveedor; cualquier envío futuro pasa por aquí antes.
 */
export const PROVIDER_MESSAGE_MAX = 5000;

export type ProviderMessageCheck = { ok: true; text: string } | { ok: false; code: "empty" | "too_long" | "has_link" };

const SCHEME = /\b(?:https?|ftp|mailto|whatsapp|tg):/i;
const WWW = /\bwww\./i;
// Dominio suelto (ej. «travelpuzzle.com.mx», «bit.ly/abc», «wa.me/…»): etiqueta + TLD de letras.
const BARE_DOMAIN = /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|info|biz|io|co|me|mx|es|ly|gl|app|dev|link|site|online|tours?|travel|ru|de|fr|it|uk|us|eu|be|to)\b/i;

// REQ-083
export function hasLink(text: string): boolean {
  return SCHEME.test(text) || WWW.test(text) || BARE_DOMAIN.test(text);
}

// REQ-083
export function checkProviderMessage(raw: unknown): ProviderMessageCheck {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return { ok: false, code: "empty" };
  if ([...text].length > PROVIDER_MESSAGE_MAX) return { ok: false, code: "too_long" };
  if (hasLink(text)) return { ok: false, code: "has_link" };
  return { ok: true, text };
}
