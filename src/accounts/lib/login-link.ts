/**
 * REQ-1599/REQ-1591: enlace para que el cliente entre a su cuenta sin contraseña. Puro (Web Crypto).
 * Firma "correo|huella|vence". La huella sale de la última actualización de la cuenta (vacía si aún no existe):
 * al entrar se actualiza la cuenta y el mismo enlace deja de servir (un solo uso). Vence en 15 minutos.
 */
export const LOGIN_LINK_TTL_MS = 15 * 60 * 1000;

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const normEmail = (email: string) => email.trim().toLowerCase();

/** Huella corta de la cuenta (fecha de su última actualización en ISO, o null si no existe). */
export async function accountFingerprint(updatedAtIso: string | null): Promise<string> {
  return b64url(await crypto.subtle.digest("SHA-256", enc.encode(`cuenta:${updatedAtIso ?? ""}`))).slice(0, 16);
}

export async function signLoginLink(secret: string, email: string, fingerprint: string, exp: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(`entrar:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(`${email}|${fingerprint}|${exp}`)));
}

export async function verifyLoginLink(secret: string, email: string, fingerprint: string, exp: number, sig: string, now: Date): Promise<boolean> {
  if (!secret || !sig || !Number.isFinite(exp) || exp < now.getTime() || exp > now.getTime() + LOGIN_LINK_TTL_MS) return false;
  const expected = await signLoginLink(secret, email, fingerprint, exp);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
